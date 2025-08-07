-- Database Functions and Stored Procedures
-- This file contains all custom functions for the auction platform
-- Generated from database audit on 2025-01-26

-- =============================================
-- AUCTION MANAGEMENT FUNCTIONS
-- =============================================

-- Function to create a new auction
CREATE OR REPLACE FUNCTION auction_create(
    p_title TEXT,
    p_description TEXT,
    p_pickup_location TEXT,
    p_delivery_location TEXT,
    p_pickup_date TIMESTAMPTZ,
    p_delivery_date TIMESTAMPTZ,
    p_starting_price DECIMAL,
    p_end_time TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auction_id UUID;
    user_role TEXT;
BEGIN
    -- Check if user is a consigner
    SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
    
    IF user_role != 'consigner' THEN
        RAISE EXCEPTION 'Only consigners can create auctions';
    END IF;
    
    -- Validate dates
    IF p_pickup_date <= now() THEN
        RAISE EXCEPTION 'Pickup date must be in the future';
    END IF;
    
    IF p_delivery_date <= p_pickup_date THEN
        RAISE EXCEPTION 'Delivery date must be after pickup date';
    END IF;
    
    IF p_end_time <= now() THEN
        RAISE EXCEPTION 'End time must be in the future';
    END IF;
    
    -- Create auction
    INSERT INTO auctions (
        title, description, pickup_location, delivery_location,
        pickup_date, delivery_date, starting_price, current_price,
        created_by, end_time
    ) VALUES (
        p_title, p_description, p_pickup_location, p_delivery_location,
        p_pickup_date, p_delivery_date, p_starting_price, p_starting_price,
        auth.uid(), p_end_time
    ) RETURNING id INTO auction_id;
    
    -- Log audit entry
    INSERT INTO auction_audit_logs (auction_id, user_id, action, new_values)
    VALUES (auction_id, auth.uid(), 'auction_created', 
           jsonb_build_object('title', p_title, 'starting_price', p_starting_price));
    
    RETURN auction_id;
END;
$$;

-- Function to place a bid
CREATE OR REPLACE FUNCTION place_bid(
    p_auction_id UUID,
    p_bid_amount DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auction_record RECORD;
    user_role TEXT;
    existing_bid DECIMAL;
BEGIN
    -- Check if user is a driver
    SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
    
    IF user_role != 'driver' THEN
        RAISE EXCEPTION 'Only drivers can place bids';
    END IF;
    
    -- Get auction details
    SELECT * INTO auction_record FROM auctions WHERE id = p_auction_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction not found';
    END IF;
    
    -- Validate auction is active
    IF auction_record.status != 'active' THEN
        RAISE EXCEPTION 'Auction is not active';
    END IF;
    
    IF auction_record.end_time <= now() THEN
        RAISE EXCEPTION 'Auction has ended';
    END IF;
    
    -- Check if bid is higher than current price
    IF p_bid_amount <= auction_record.current_price THEN
        RAISE EXCEPTION 'Bid must be higher than current price';
    END IF;
    
    -- Get existing bid from this user
    SELECT bid_amount INTO existing_bid 
    FROM auction_bids 
    WHERE auction_id = p_auction_id AND user_id = auth.uid();
    
    -- Insert or update bid
    INSERT INTO auction_bids (auction_id, user_id, bid_amount)
    VALUES (p_auction_id, auth.uid(), p_bid_amount)
    ON CONFLICT (auction_id, user_id)
    DO UPDATE SET bid_amount = p_bid_amount, created_at = now();
    
    -- Update auction current price
    UPDATE auctions 
    SET current_price = p_bid_amount, updated_at = now()
    WHERE id = p_auction_id;
    
    -- Log audit entry
    INSERT INTO auction_audit_logs (auction_id, user_id, action, old_values, new_values)
    VALUES (p_auction_id, auth.uid(), 'bid_placed',
           CASE WHEN existing_bid IS NOT NULL THEN jsonb_build_object('bid_amount', existing_bid) ELSE NULL END,
           jsonb_build_object('bid_amount', p_bid_amount));
    
    RETURN TRUE;
END;
$$;

-- Function to complete auction
CREATE OR REPLACE FUNCTION complete_auction(p_auction_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auction_record RECORD;
    winning_bid RECORD;
BEGIN
    -- Get auction details
    SELECT * INTO auction_record FROM auctions WHERE id = p_auction_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction not found';
    END IF;
    
    -- Check if user owns the auction
    IF auction_record.created_by != auth.uid() THEN
        RAISE EXCEPTION 'Only auction creator can complete auction';
    END IF;
    
    -- Check if auction is active
    IF auction_record.status != 'active' THEN
        RAISE EXCEPTION 'Auction is not active';
    END IF;
    
    -- Find winning bid
    SELECT ab.*, p.full_name, p.email, p.phone
    INTO winning_bid
    FROM auction_bids ab
    JOIN profiles p ON ab.user_id = p.id
    WHERE ab.auction_id = p_auction_id
    ORDER BY ab.bid_amount DESC, ab.created_at ASC
    LIMIT 1;
    
    -- Update auction status
    UPDATE auctions 
    SET status = 'completed', 
        winner_id = CASE WHEN winning_bid.user_id IS NOT NULL THEN winning_bid.user_id ELSE NULL END,
        updated_at = now()
    WHERE id = p_auction_id;
    
    -- Log audit entry
    INSERT INTO auction_audit_logs (auction_id, user_id, action, new_values)
    VALUES (p_auction_id, auth.uid(), 'auction_completed',
           jsonb_build_object('winner_id', winning_bid.user_id, 'winning_amount', winning_bid.bid_amount));
    
    RETURN TRUE;
END;
$$;

-- =============================================
-- NOTIFICATION FUNCTIONS
-- =============================================

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_auction_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO auction_notifications (user_id, auction_id, type, title, message)
    VALUES (p_user_id, p_auction_id, p_type, p_title, p_message)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE auction_notifications 
    SET is_read = TRUE 
    WHERE id = p_notification_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read for user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE auction_notifications 
    SET is_read = TRUE 
    WHERE user_id = auth.uid() AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to get user's active auctions
CREATE OR REPLACE FUNCTION get_user_auctions()
RETURNS TABLE (
    id UUID,
    title TEXT,
    status TEXT,
    current_price DECIMAL,
    bid_count BIGINT,
    end_time TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.status,
        a.current_price,
        COUNT(ab.id) as bid_count,
        a.end_time
    FROM auctions a
    LEFT JOIN auction_bids ab ON a.id = ab.auction_id
    WHERE a.created_by = auth.uid()
    GROUP BY a.id, a.title, a.status, a.current_price, a.end_time
    ORDER BY a.created_at DESC;
END;
$$;

-- Function to get auction details with bids
CREATE OR REPLACE FUNCTION get_auction_with_bids(p_auction_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'auction', row_to_json(a),
        'bids', COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'id', ab.id,
                    'bid_amount', ab.bid_amount,
                    'created_at', ab.created_at,
                    'user', json_build_object(
                        'id', p.id,
                        'full_name', p.full_name,
                        'email', p.email
                    )
                ) ORDER BY ab.bid_amount DESC, ab.created_at ASC
            )
            FROM auction_bids ab
            JOIN profiles p ON ab.user_id = p.id
            WHERE ab.auction_id = p_auction_id), '[]'::json
        )
    ) INTO result
    FROM auctions a
    WHERE a.id = p_auction_id;
    
    RETURN result;
END;
$$;

-- Function to cleanup expired auctions
CREATE OR REPLACE FUNCTION cleanup_expired_auctions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Auto-complete expired auctions
    UPDATE auctions 
    SET status = 'completed', updated_at = now()
    WHERE status = 'active' AND end_time <= now();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log cleanup action
    INSERT INTO auction_audit_logs (auction_id, action, new_values)
    SELECT id, 'auto_completed', jsonb_build_object('reason', 'expired')
    FROM auctions 
    WHERE status = 'completed' AND updated_at >= now() - interval '1 minute';
    
    RETURN updated_count;
END;
$$;
