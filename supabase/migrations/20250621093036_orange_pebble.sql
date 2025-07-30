/*
  # Fix ambiguous auction_id column references

  1. Database Functions
    - Update `handle_consigner_cancellation` function to properly qualify auction_id references
    - Update `handle_winner_cancellation` function to properly qualify auction_id references
    - Remove ambiguity by using table aliases and fully qualified column names

  2. Changes Made
    - Replace ambiguous `auction_id` references with properly qualified table.column syntax
    - Ensure all JOIN conditions and WHERE clauses use explicit table references
    - Maintain existing function logic while fixing column reference issues
*/

-- Drop existing functions to recreate them with fixed column references
DROP FUNCTION IF EXISTS handle_consigner_cancellation(uuid);
DROP FUNCTION IF EXISTS handle_winner_cancellation(uuid);

-- Recreate handle_consigner_cancellation function with proper column qualification
CREATE OR REPLACE FUNCTION handle_consigner_cancellation(auction_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auction_record RECORD;
BEGIN
    -- Get auction details with proper qualification
    SELECT a.id, a.status, a.created_by, a.winner_id
    INTO auction_record
    FROM auctions a
    WHERE a.id = auction_id_param;
    
    -- Check if auction exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction not found';
    END IF;
    
    -- Check if user is the consigner
    IF auction_record.created_by != auth.uid() THEN
        RAISE EXCEPTION 'Only the consigner can cancel this auction';
    END IF;
    
    -- Check if auction can be cancelled
    IF auction_record.status != 'active' THEN
        RAISE EXCEPTION 'Only active auctions can be cancelled';
    END IF;
    
    -- Update auction status to cancelled
    UPDATE auctions 
    SET status = 'cancelled'
    WHERE id = auction_id_param;
    
    -- Create notifications for all bidders
    INSERT INTO auction_notifications (user_id, auction_id, type, message)
    SELECT DISTINCT ab.user_id, auction_id_param, 'auction_cancelled', 
           'The auction you bid on has been cancelled by the consigner'
    FROM auction_bids ab
    WHERE ab.auction_id = auction_id_param;
    
    -- Log the cancellation
    INSERT INTO auction_audit_logs (auction_id, user_id, action, details)
    VALUES (auction_id_param, auth.uid(), 'consigner_cancellation', 
            jsonb_build_object('reason', 'cancelled_by_consigner'));
END;
$$;

-- Recreate handle_winner_cancellation function with proper column qualification
CREATE OR REPLACE FUNCTION handle_winner_cancellation(auction_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auction_record RECORD;
    next_highest_bid RECORD;
BEGIN
    -- Get auction details with proper qualification
    SELECT a.id, a.status, a.created_by, a.winner_id, a.winning_bid_id
    INTO auction_record
    FROM auctions a
    WHERE a.id = auction_id_param;
    
    -- Check if auction exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction not found';
    END IF;
    
    -- Check if user is the winner
    IF auction_record.winner_id != auth.uid() THEN
        RAISE EXCEPTION 'Only the winner can cancel their participation';
    END IF;
    
    -- Check if auction is completed
    IF auction_record.status != 'completed' THEN
        RAISE EXCEPTION 'Only completed auctions can be cancelled by winner';
    END IF;
    
    -- Find the next highest bid (excluding the current winning bid)
    SELECT ab.id, ab.user_id, ab.amount
    INTO next_highest_bid
    FROM auction_bids ab
    WHERE ab.auction_id = auction_id_param 
      AND ab.id != auction_record.winning_bid_id
    ORDER BY ab.amount DESC, ab.created_at ASC
    LIMIT 1;
    
    IF FOUND THEN
        -- Update auction with new winner
        UPDATE auctions 
        SET winner_id = next_highest_bid.user_id,
            winning_bid_id = next_highest_bid.id
        WHERE id = auction_id_param;
        
        -- Update bid status
        UPDATE auction_bids 
        SET is_winning_bid = false 
        WHERE id = auction_record.winning_bid_id;
        
        UPDATE auction_bids 
        SET is_winning_bid = true 
        WHERE id = next_highest_bid.id;
        
        -- Notify new winner
        INSERT INTO auction_notifications (user_id, auction_id, type, message)
        VALUES (next_highest_bid.user_id, auction_id_param, 'auction_won', 
                'Congratulations! You are now the winner of this auction');
        
        -- Notify consigner
        INSERT INTO auction_notifications (user_id, auction_id, type, message)
        VALUES (auction_record.created_by, auction_id_param, 'winner_changed', 
                'The auction winner has changed due to cancellation');
    ELSE
        -- No other bids, revert to active status
        UPDATE auctions 
        SET status = 'active',
            winner_id = NULL,
            winning_bid_id = NULL,
            end_time = NOW() + INTERVAL '24 hours'  -- Extend by 24 hours
        WHERE id = auction_id_param;
        
        -- Update bid status
        UPDATE auction_bids 
        SET is_winning_bid = false 
        WHERE id = auction_record.winning_bid_id;
        
        -- Notify consigner
        INSERT INTO auction_notifications (user_id, auction_id, type, message)
        VALUES (auction_record.created_by, auction_id_param, 'auction_reopened', 
                'Your auction has been reopened due to winner cancellation');
    END IF;
    
    -- Log the cancellation
    INSERT INTO auction_audit_logs (auction_id, user_id, action, details)
    VALUES (auction_id_param, auth.uid(), 'winner_cancellation', 
            jsonb_build_object('reason', 'cancelled_by_winner', 'new_winner_id', next_highest_bid.user_id));
END;
$$;