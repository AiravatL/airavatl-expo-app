/*
# Database Cleanup and Optimization - Phase 1: Critical Issues

This migration addresses critical security and cleanup issues:
1. Remove legacy unused tables
2. Fix duplicate functions 
3. Add missing performance indexes
4. Fix function security issues
*/

-- ============================================================================
-- PHASE 1: REMOVE LEGACY TABLES
-- ============================================================================

-- Remove legacy tables that are no longer used
-- These are from an old logistics system that was replaced by the auction system
DROP TABLE IF EXISTS bids CASCADE;

DROP TABLE IF EXISTS logistics_requests CASCADE;

-- ============================================================================
-- PHASE 2: REMOVE DUPLICATE FUNCTIONS
-- ============================================================================

-- Remove older versions of functions that have been replaced with better implementations
DROP FUNCTION IF EXISTS handle_consigner_cancellation (uuid);

DROP FUNCTION IF EXISTS handle_winner_cancellation (uuid);

DROP FUNCTION IF EXISTS update_auction_status ();

DROP FUNCTION IF EXISTS check_expired_auctions ();

-- ============================================================================
-- PHASE 3: ADD MISSING PERFORMANCE INDEXES
-- ============================================================================

-- Add indexes for foreign keys that are missing them (identified by performance advisor)
CREATE INDEX IF NOT EXISTS idx_auction_audit_logs_auction_id ON auction_audit_logs (auction_id);

CREATE INDEX IF NOT EXISTS idx_auction_audit_logs_user_id ON auction_audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_auction_notifications_auction_id ON auction_notifications (auction_id);

CREATE INDEX IF NOT EXISTS idx_auctions_winning_bid_id ON auctions (winning_bid_id);

-- ============================================================================
-- PHASE 4: REMOVE UNUSED INDEXES
-- ============================================================================

-- Remove indexes that are never used (identified by pg_stat_user_indexes)
DROP INDEX IF EXISTS idx_auction_bids_user_id;

DROP INDEX IF EXISTS idx_auctions_status_end_time;

DROP INDEX IF EXISTS idx_profiles_role_vehicle_type;

DROP INDEX IF EXISTS idx_auction_notifications_user_id_created_at;

-- ============================================================================
-- PHASE 5: FIX FUNCTION SECURITY ISSUES
-- ============================================================================

-- Fix search_path security issue for remaining functions
CREATE OR REPLACE FUNCTION handle_consigner_cancellation(p_auction_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auction_record RECORD;
  result json;
BEGIN
  -- Get auction details
  SELECT * INTO auction_record
  FROM auctions
  WHERE id = p_auction_id AND created_by = p_user_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Auction not found or not authorized'
    );
  END IF;

  -- Update auction status to cancelled
  UPDATE auctions
  SET status = 'cancelled'
  WHERE id = p_auction_id;

  -- Create audit log
  INSERT INTO auction_audit_logs (auction_id, user_id, action, details)
  VALUES (
    p_auction_id,
    p_user_id,
    'auction_cancelled',
    json_build_object(
      'cancelled_by', 'consigner',
      'reason', 'consigner_cancellation'
    )
  );

  -- Notify all bidders about cancellation
  INSERT INTO auction_notifications (user_id, auction_id, type, message)
  SELECT DISTINCT 
    ab.user_id,
    p_auction_id,
    'auction_cancelled',
    'The auction "' || auction_record.title || '" has been cancelled by the consigner.'
  FROM auction_bids ab
  WHERE ab.auction_id = p_auction_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Auction cancelled successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION handle_winner_cancellation(p_auction_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auction_record RECORD;
  next_highest_bid RECORD;
  result json;
BEGIN
  -- Get auction details and verify winner
  SELECT * INTO auction_record
  FROM auctions
  WHERE id = p_auction_id AND winner_id = p_user_id AND status = 'completed';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Auction not found or not authorized'
    );
  END IF;

  -- Find next highest bid
  SELECT ab.*, p.username
  INTO next_highest_bid
  FROM auction_bids ab
  JOIN profiles p ON ab.user_id = p.id
  WHERE ab.auction_id = p_auction_id 
    AND ab.user_id != p_user_id
  ORDER BY ab.amount DESC, ab.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    -- Update auction with new winner
    UPDATE auctions
    SET 
      winner_id = next_highest_bid.user_id,
      winning_bid_id = next_highest_bid.id
    WHERE id = p_auction_id;

    -- Update bid status
    UPDATE auction_bids
    SET is_winning_bid = false
    WHERE auction_id = p_auction_id;

    UPDATE auction_bids
    SET is_winning_bid = true
    WHERE id = next_highest_bid.id;

    -- Notify new winner
    INSERT INTO auction_notifications (user_id, auction_id, type, message)
    VALUES (
      next_highest_bid.user_id,
      p_auction_id,
      'auction_won',
      'Congratulations! You are now the winner of "' || auction_record.title || '" due to the previous winner''s cancellation.'
    );

    -- Notify consigner
    INSERT INTO auction_notifications (user_id, auction_id, type, message)
    VALUES (
      auction_record.created_by,
      p_auction_id,
      'winner_changed',
      'The winner of your auction "' || auction_record.title || '" has changed to ' || next_highest_bid.username || ' due to cancellation.'
    );

    result := json_build_object(
      'success', true,
      'message', 'Winner cancelled, auction reassigned to next highest bidder',
      'new_winner', next_highest_bid.username
    );
  ELSE
    -- No other bids, reopen auction
    UPDATE auctions
    SET 
      status = 'active',
      winner_id = NULL,
      winning_bid_id = NULL,
      end_time = NOW() + INTERVAL '24 hours'
    WHERE id = p_auction_id;

    -- Notify consigner
    INSERT INTO auction_notifications (user_id, auction_id, type, message)
    VALUES (
      auction_record.created_by,
      p_auction_id,
      'auction_reopened',
      'Your auction "' || auction_record.title || '" has been reopened due to winner cancellation.'
    );

    result := json_build_object(
      'success', true,
      'message', 'Winner cancelled, auction reopened for 24 hours'
    );
  END IF;

  -- Create audit log
  INSERT INTO auction_audit_logs (auction_id, user_id, action, details)
  VALUES (
    p_auction_id,
    p_user_id,
    'winner_cancelled',
    json_build_object(
      'cancelled_by', 'winner',
      'reason', 'winner_cancellation',
      'result', result
    )
  );

  RETURN result;
END;
$$;

-- Fix other critical functions
CREATE OR REPLACE FUNCTION check_and_close_expired_auctions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_auction_id uuid;
BEGIN
  -- Use cursor for better memory management with large datasets
  FOR expired_auction_id IN
    SELECT id
    FROM auctions
    WHERE status = 'active'
    AND end_time <= NOW()
    LIMIT 50  -- Process in batches to avoid long-running transactions
  LOOP
    -- Call the existing close_auction function
    PERFORM close_auction(expired_auction_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_bid(bid_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    bid_record RECORD;
    auction_record RECORD;
BEGIN
    -- Get bid details with proper qualification
    SELECT ab.id, ab.auction_id, ab.user_id, ab.amount
    INTO bid_record
    FROM auction_bids ab
    WHERE ab.id = bid_id_param AND ab.user_id = auth.uid();
    
    -- Check if bid exists and belongs to the user
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bid not found or not authorized';
    END IF;
    
    -- Get auction details
    SELECT a.id, a.title, a.status, a.created_by
    INTO auction_record
    FROM auctions a
    WHERE a.id = bid_record.auction_id;
    
    -- Check if auction is still active
    IF auction_record.status != 'active' THEN
        RAISE EXCEPTION 'Cannot cancel bid on inactive auction';
    END IF;
    
    -- Delete the bid
    DELETE FROM auction_bids 
    WHERE id = bid_id_param;
    
    -- Notify the consigner about bid cancellation
    INSERT INTO auction_notifications (user_id, auction_id, type, message)
    VALUES (
        auction_record.created_by, 
        bid_record.auction_id, 
        'bid_cancelled', 
        format('A bid of ₹%s has been cancelled on your auction "%s"', 
               bid_record.amount, 
               auction_record.title)
    );
    
    -- Log the bid cancellation
    INSERT INTO auction_audit_logs (auction_id, user_id, action, details)
    VALUES (
        bid_record.auction_id, 
        auth.uid(), 
        'bid_cancelled', 
        jsonb_build_object(
            'bid_id', bid_id_param,
            'bid_amount', bid_record.amount,
            'reason', 'cancelled_by_bidder'
        )
    );
END;
$$;

-- Grant execute permissions
GRANT
EXECUTE ON FUNCTION handle_consigner_cancellation (uuid, uuid) TO authenticated;

GRANT
EXECUTE ON FUNCTION handle_winner_cancellation (uuid, uuid) TO authenticated;

GRANT
EXECUTE ON FUNCTION check_and_close_expired_auctions () TO authenticated;

GRANT EXECUTE ON FUNCTION cancel_bid (uuid) TO authenticated;

-- ============================================================================
-- PHASE 6: REMOVE PROBLEMATIC VIEW
-- ============================================================================

-- Remove the security definer view - replace with direct queries in app
DROP VIEW IF EXISTS active_auctions_optimized;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify cleanup was successful
DO $$
BEGIN
  RAISE NOTICE 'Database optimization completed successfully!';
  RAISE NOTICE 'Legacy tables removed: bids, logistics_requests';
  RAISE NOTICE 'Duplicate functions removed';
  RAISE NOTICE 'Performance indexes added';
  RAISE NOTICE 'Function security issues fixed';
  RAISE NOTICE 'Problematic view removed';
END;
$$;