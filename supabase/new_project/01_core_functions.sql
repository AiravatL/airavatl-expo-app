/*
# Core Business Functions - Clean Implementation
# Version: 2.0
# Date: August 2, 2025

Optimized functions for auction operations:
- Auction lifecycle management
- Bid processing
- Winner determination
- Cancellation handling
- Background processing
*/

-- ============================================================================
-- AUCTION LIFECYCLE FUNCTIONS
-- ============================================================================

-- Function to create an auction with validation
CREATE OR REPLACE FUNCTION create_auction_optimized(
    p_title text,
    p_description text,
    p_vehicle_type text,
    p_start_time timestamptz,
    p_end_time timestamptz,
    p_consignment_date timestamptz,
    p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_auction_id uuid;
BEGIN
    -- Validate user is a consigner
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_created_by AND role = 'consigner'
    ) THEN
        RAISE EXCEPTION 'Only consigners can create auctions';
    END IF;
    
    -- Insert auction
    INSERT INTO auctions (
        title, description, vehicle_type, start_time, 
        end_time, consignment_date, created_by
    ) VALUES (
        p_title, p_description, p_vehicle_type, p_start_time,
        p_end_time, p_consignment_date, p_created_by
    ) RETURNING id INTO new_auction_id;
    
    -- Log auction creation
    PERFORM log_auction_activity(
        new_auction_id,
        p_created_by,
        'auction_created',
        jsonb_build_object(
            'title', p_title,
            'vehicle_type', p_vehicle_type,
            'end_time', p_end_time
        )
    );
    
    RETURN new_auction_id;
END;
$$;

-- Function to place a bid with validation
CREATE OR REPLACE FUNCTION create_bid_optimized(
    p_auction_id uuid,
    p_user_id uuid,
    p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    auction_info record;
    new_bid_id uuid;
    result jsonb;
BEGIN
    -- Get auction info and validate
    SELECT id, status, end_time, created_by, title
    INTO auction_info
    FROM auctions
    WHERE id = p_auction_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
    END IF;
    
    -- Validate auction is active
    IF auction_info.status != 'active' OR auction_info.end_time <= now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Auction is not active');
    END IF;
    
    -- Validate user is a driver
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_user_id AND role = 'driver'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only drivers can place bids');
    END IF;
    
    -- Validate user is not the auction creator
    IF auction_info.created_by = p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot bid on your own auction');
    END IF;
    
    -- Insert or update bid (upsert)
    INSERT INTO auction_bids (auction_id, user_id, amount)
    VALUES (p_auction_id, p_user_id, p_amount)
    ON CONFLICT (auction_id, user_id, amount) 
    DO UPDATE SET created_at = now()
    RETURNING id INTO new_bid_id;
    
    -- Update winning bid status
    UPDATE auction_bids 
    SET is_winning_bid = false 
    WHERE auction_id = p_auction_id;
    
    UPDATE auction_bids 
    SET is_winning_bid = true
    WHERE id = (
        SELECT id FROM auction_bids
        WHERE auction_id = p_auction_id
        ORDER BY amount ASC, created_at ASC
        LIMIT 1
    );
    
    -- Log bid activity
    PERFORM log_auction_activity(
        p_auction_id,
        p_user_id,
        'bid_placed',
        jsonb_build_object(
            'amount', p_amount,
            'bid_id', new_bid_id
        )
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'bid_id', new_bid_id,
        'message', 'Bid placed successfully'
    );
END;
$$;

-- Function to close auction and determine winner
CREATE OR REPLACE FUNCTION close_auction_optimized(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    auction_info record;
    winning_bid record;
    result jsonb;
BEGIN
    -- Get auction info
    SELECT id, status, title, created_by, end_time
    INTO auction_info
    FROM auctions
    WHERE id = p_auction_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
    END IF;
    
    -- Only close active auctions that have ended
    IF auction_info.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Auction is not active');
    END IF;
    
    -- Find winning bid (lowest amount, earliest timestamp)
    SELECT id, user_id, amount
    INTO winning_bid
    FROM auction_bids
    WHERE auction_id = p_auction_id
    ORDER BY amount ASC, created_at ASC
    LIMIT 1;
    
    -- Update auction status
    UPDATE auctions
    SET 
        status = 'completed',
        winner_id = winning_bid.user_id,
        winning_bid_id = winning_bid.id,
        updated_at = now()
    WHERE id = p_auction_id;
    
    -- Update winning bid flag
    IF winning_bid.id IS NOT NULL THEN
        UPDATE auction_bids 
        SET is_winning_bid = false 
        WHERE auction_id = p_auction_id;
        
        UPDATE auction_bids 
        SET is_winning_bid = true 
        WHERE id = winning_bid.id;
    END IF;
    
    -- Log auction completion
    PERFORM log_auction_activity(
        p_auction_id,
        winning_bid.user_id,
        'auction_completed',
        jsonb_build_object(
            'winner_id', winning_bid.user_id,
            'winning_amount', winning_bid.amount,
            'winning_bid_id', winning_bid.id
        )
    );
    
    -- Create notifications (handled by separate function)
    IF winning_bid.user_id IS NOT NULL THEN
        PERFORM create_auction_notification(
            winning_bid.user_id,
            p_auction_id,
            'auction_won',
            format('Congratulations! You won the auction "%s" with a bid of ₹%s', 
                   auction_info.title, winning_bid.amount)
        );
        
        PERFORM create_auction_notification(
            auction_info.created_by,
            p_auction_id,
            'auction_completed',
            format('Your auction "%s" has been completed with a winning bid of ₹%s', 
                   auction_info.title, winning_bid.amount)
        );
    ELSE
        PERFORM create_auction_notification(
            auction_info.created_by,
            p_auction_id,
            'auction_completed',
            format('Your auction "%s" has completed with no bids', 
                   auction_info.title)
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'winner_id', winning_bid.user_id,
        'winning_amount', winning_bid.amount,
        'message', 'Auction closed successfully'
    );
END;
$$;

-- Automated function to check and close expired auctions
CREATE OR REPLACE FUNCTION check_and_close_expired_auctions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expired_auction record;
    closed_count int := 0;
BEGIN
    -- Find and close expired auctions
    FOR expired_auction IN
        SELECT id FROM auctions
        WHERE status = 'active' 
        AND end_time <= now()
        ORDER BY end_time ASC
    LOOP
        PERFORM close_auction_optimized(expired_auction.id);
        closed_count := closed_count + 1;
    END LOOP;
    
    RETURN closed_count;
END;
$$;

-- ============================================================================
-- CANCELLATION FUNCTIONS
-- ============================================================================

-- Function to cancel auction by consigner
CREATE OR REPLACE FUNCTION cancel_auction_by_consigner(
    p_auction_id uuid,
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    auction_info record;
    result jsonb;
BEGIN
    -- Get and validate auction
    SELECT id, status, created_by, title
    INTO auction_info
    FROM auctions
    WHERE id = p_auction_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Auction not found');
    END IF;
    
    -- Validate user is the auction creator
    IF auction_info.created_by != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    
    -- Validate auction can be cancelled
    IF auction_info.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Auction cannot be cancelled');
    END IF;
    
    -- Cancel auction
    UPDATE auctions 
    SET status = 'cancelled', updated_at = now()
    WHERE id = p_auction_id;
    
    -- Notify all bidders
    INSERT INTO auction_notifications (user_id, auction_id, type, message)
    SELECT 
        DISTINCT user_id,
        p_auction_id,
        'auction_cancelled',
        format('The auction "%s" has been cancelled by the consigner', auction_info.title)
    FROM auction_bids
    WHERE auction_id = p_auction_id;
    
    -- Log cancellation
    PERFORM log_auction_activity(
        p_auction_id,
        p_user_id,
        'auction_cancelled',
        jsonb_build_object('cancelled_by', 'consigner')
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Auction cancelled successfully'
    );
END;
$$;

-- Function to cancel bid by driver
CREATE OR REPLACE FUNCTION cancel_bid_by_driver(
    p_bid_id uuid,
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    bid_info record;
    auction_info record;
    result jsonb;
BEGIN
    -- Get bid info
    SELECT id, auction_id, user_id, amount, is_winning_bid
    INTO bid_info
    FROM auction_bids
    WHERE id = p_bid_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bid not found');
    END IF;
    
    -- Validate user owns the bid
    IF bid_info.user_id != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    
    -- Get auction info
    SELECT status, title, created_by
    INTO auction_info
    FROM auctions
    WHERE id = bid_info.auction_id;
    
    -- Validate auction is still active
    IF auction_info.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel bid on inactive auction');
    END IF;
    
    -- Don't allow cancelling winning bid
    IF bid_info.is_winning_bid THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel winning bid');
    END IF;
    
    -- Delete the bid
    DELETE FROM auction_bids WHERE id = p_bid_id;
    
    -- Notify auction creator
    PERFORM create_auction_notification(
        auction_info.created_by,
        bid_info.auction_id,
        'bid_cancelled',
        format('A bid of ₹%s was cancelled on your auction "%s"', 
               bid_info.amount, auction_info.title)
    );
    
    -- Log cancellation
    PERFORM log_auction_activity(
        bid_info.auction_id,
        p_user_id,
        'bid_cancelled',
        jsonb_build_object(
            'bid_id', p_bid_id,
            'amount', bid_info.amount
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Bid cancelled successfully'
    );
END;
$$;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to create notifications
CREATE OR REPLACE FUNCTION create_auction_notification(
    p_user_id uuid,
    p_auction_id uuid,
    p_type text,
    p_message text,
    p_data jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    notification_id uuid;
BEGIN
    INSERT INTO auction_notifications (user_id, auction_id, type, message, data)
    VALUES (p_user_id, p_auction_id, p_type, p_message, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- Function to log auction activities
CREATE OR REPLACE FUNCTION log_auction_activity(
    p_auction_id uuid,
    p_user_id uuid,
    p_action text,
    p_details jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO auction_audit_logs (auction_id, user_id, action, details)
    VALUES (p_auction_id, p_user_id, p_action, p_details)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Function to get optimized auction details for mobile app
CREATE OR REPLACE FUNCTION get_auction_details_optimized(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    auction_data jsonb;
    bids_data jsonb;
    result jsonb;
BEGIN
    -- Get auction details with creator info
    SELECT jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'description', a.description,
        'vehicle_type', a.vehicle_type,
        'start_time', a.start_time,
        'end_time', a.end_time,
        'consignment_date', a.consignment_date,
        'status', a.status,
        'created_by', a.created_by,
        'winner_id', a.winner_id,
        'winning_bid_id', a.winning_bid_id,
        'creator_username', p.username,
        'winner_username', w.username
    ) INTO auction_data
    FROM auctions a
    LEFT JOIN profiles p ON a.created_by = p.id
    LEFT JOIN profiles w ON a.winner_id = w.id
    WHERE a.id = p_auction_id;
    
    -- Get bids with bidder info
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', b.id,
            'amount', b.amount,
            'created_at', b.created_at,
            'is_winning_bid', b.is_winning_bid,
            'bidder_username', p.username
        ) ORDER BY b.amount ASC, b.created_at ASC
    ) INTO bids_data
    FROM auction_bids b
    LEFT JOIN profiles p ON b.user_id = p.id
    WHERE b.auction_id = p_auction_id;
    
    -- Combine results
    result := jsonb_build_object(
        'auction', auction_data,
        'bids', COALESCE(bids_data, '[]'::jsonb)
    );
    
    RETURN result;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_auction_optimized TO authenticated;

GRANT EXECUTE ON FUNCTION create_bid_optimized TO authenticated;

GRANT EXECUTE ON FUNCTION close_auction_optimized TO authenticated;

GRANT
EXECUTE ON FUNCTION check_and_close_expired_auctions TO authenticated;

GRANT
EXECUTE ON FUNCTION cancel_auction_by_consigner TO authenticated;

GRANT EXECUTE ON FUNCTION cancel_bid_by_driver TO authenticated;

GRANT
EXECUTE ON FUNCTION create_auction_notification TO authenticated;

GRANT EXECUTE ON FUNCTION log_auction_activity TO authenticated;

GRANT
EXECUTE ON FUNCTION get_auction_details_optimized TO authenticated;