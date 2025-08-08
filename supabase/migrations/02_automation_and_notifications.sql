/*
# Background Automation and Push Notifications
# Version: 2.0  
# Date: August 2, 2025

Automated tasks and push notification system:
- Background auction closure
- Push notification integration
- Automated cleanup tasks
- Performance monitoring
*/

-- ============================================================================
-- PUSH NOTIFICATION FUNCTIONS
-- ============================================================================

-- Function to send push notifications via HTTP request
CREATE OR REPLACE FUNCTION send_push_notification(
    p_user_id uuid,
    p_title text,
    p_body text,
    p_data jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_push_token text;
    notification_payload jsonb;
    http_response record;
BEGIN
    -- Get user's push token
    SELECT push_token INTO user_push_token
    FROM profiles
    WHERE id = p_user_id;
    
    -- Skip if no push token
    IF user_push_token IS NULL THEN
        RETURN false;
    END IF;
    
    -- Build notification payload for Expo
    notification_payload := jsonb_build_object(
        'to', user_push_token,
        'title', p_title,
        'body', p_body,
        'data', p_data,
        'sound', 'default',
        'priority', 'high'
    );
    
    -- Send HTTP request to Expo Push API
    -- Note: This requires the http extension and proper configuration
    -- For now, we'll just log the notification
    PERFORM log_auction_activity(
        NULL, -- No specific auction
        p_user_id,
        'push_notification_sent',
        jsonb_build_object(
            'title', p_title,
            'body', p_body,
            'data', p_data
        )
    );
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the main operation
        PERFORM log_auction_activity(
            NULL,
            p_user_id,
            'push_notification_failed',
            jsonb_build_object(
                'title', p_title,
                'error', SQLERRM
            )
        );
        RETURN false;
END;
$$;

-- Enhanced notification function with push notifications
CREATE OR REPLACE FUNCTION create_notification_with_push(
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
    push_title text;
    auction_title text;
BEGIN
    -- Create database notification
    notification_id := create_auction_notification(
        p_user_id, p_auction_id, p_type, p_message, p_data
    );
    
    -- Get auction title for push notification
    SELECT title INTO auction_title
    FROM auctions
    WHERE id = p_auction_id;
    
    -- Determine push notification title
    push_title := CASE p_type
        WHEN 'auction_won' THEN 'Auction Won! 🎉'
        WHEN 'outbid' THEN 'You''ve been outbid 📢'
        WHEN 'bid_placed' THEN 'New bid placed 💰'
        WHEN 'auction_created' THEN 'New auction available! 🚚'
        WHEN 'auction_updated' THEN 'Auction updated! 🔄'
        WHEN 'auction_cancelled' THEN 'Auction cancelled ❌'
        WHEN 'auction_completed' THEN 'Auction completed ✅'
        ELSE 'Airavatl Notification'
    END;
    
    -- Send push notification (non-blocking)
    PERFORM send_push_notification(
        p_user_id,
        push_title,
        p_message,
        jsonb_build_object(
            'auction_id', p_auction_id,
            'type', p_type,
            'notification_id', notification_id
        )
    );
    
    RETURN notification_id;
END;
$$;

-- ============================================================================
-- BACKGROUND AUTOMATION
-- ============================================================================

-- Function to run periodic auction maintenance
CREATE OR REPLACE FUNCTION run_auction_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    closed_count int := 0;
    cleaned_count int := 0;
    result jsonb;
BEGIN
    -- Close expired auctions
    closed_count := check_and_close_expired_auctions();
    
    -- Clean up old notifications (older than 30 days)
    DELETE FROM auction_notifications
    WHERE created_at < now() - interval '30 days'
    AND is_read = true;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Clean up old audit logs (older than 90 days, except important actions)
    DELETE FROM auction_audit_logs
    WHERE created_at < now() - interval '90 days'
    AND action NOT IN ('auction_created', 'auction_completed', 'auction_cancelled');
    
    -- Update statistics
    result := jsonb_build_object(
        'auctions_closed', closed_count,
        'notifications_cleaned', cleaned_count,
        'maintenance_completed_at', now()
    );
    
    -- Log maintenance activity
    PERFORM log_auction_activity(
        NULL,
        NULL,
        'system_maintenance',
        result
    );
    
    RETURN result;
END;
$$;

-- ============================================================================
-- ENHANCED AUCTION CLOSURE WITH NOTIFICATIONS
-- ============================================================================

-- Enhanced auction closure with comprehensive notifications
CREATE OR REPLACE FUNCTION close_auction_with_notifications(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    auction_info record;
    winning_bid record;
    losing_bidders record;
    result jsonb;
BEGIN
    -- Close auction using optimized function
    result := close_auction_optimized(p_auction_id);
    
    -- If closure failed, return early
    IF (result->>'success')::boolean = false THEN
        RETURN result;
    END IF;
    
    -- Get auction and winner details
    SELECT a.id, a.title, a.created_by, a.winner_id, 
           b.amount as winning_amount, p.username as winner_username
    INTO auction_info
    FROM auctions a
    LEFT JOIN auction_bids b ON a.winning_bid_id = b.id
    LEFT JOIN profiles p ON a.winner_id = p.id
    WHERE a.id = p_auction_id;
    
    -- Send enhanced notifications
    IF auction_info.winner_id IS NOT NULL THEN
        -- Notify winner with push
        PERFORM create_notification_with_push(
            auction_info.winner_id,
            p_auction_id,
            'auction_won',
            format('Congratulations! You won "%s" with a bid of ₹%s. Contact details will be shared shortly.',
                   auction_info.title, auction_info.winning_amount)
        );
        
        -- Notify consigner with push
        PERFORM create_notification_with_push(
            auction_info.created_by,
            p_auction_id,
            'auction_completed',
            format('Your auction "%s" was won by %s for ₹%s. Contact details will be shared shortly.',
                   auction_info.title, auction_info.winner_username, auction_info.winning_amount)
        );
        
        -- Notify losing bidders
        FOR losing_bidders IN
            SELECT DISTINCT user_id
            FROM auction_bids
            WHERE auction_id = p_auction_id
            AND user_id != auction_info.winner_id
        LOOP
            PERFORM create_notification_with_push(
                losing_bidders.user_id,
                p_auction_id,
                'auction_lost',
                format('The auction "%s" has ended. Unfortunately, you did not win this time.',
                       auction_info.title)
            );
        END LOOP;
    ELSE
        -- No winner - notify consigner
        PERFORM create_notification_with_push(
            auction_info.created_by,
            p_auction_id,
            'auction_completed',
            format('Your auction "%s" has ended with no bids. You may create a new auction.',
                   auction_info.title)
        );
    END IF;
    
    RETURN result;
END;
$$;

-- ============================================================================
-- VIEWS FOR OPTIMIZED QUERIES
-- ============================================================================

-- View for active auctions with bid counts
CREATE OR REPLACE VIEW active_auctions_summary AS
SELECT
    a.id,
    a.title,
    a.description,
    a.vehicle_type,
    a.start_time,
    a.end_time,
    a.consignment_date,
    a.created_by,
    p.username as creator_username,
    COALESCE(bid_stats.bid_count, 0) as bid_count,
    COALESCE(bid_stats.lowest_bid, 0) as current_lowest_bid,
    CASE
        WHEN a.end_time <= now() THEN 'expired'
        WHEN a.start_time > now() THEN 'upcoming'
        ELSE 'active'
    END as calculated_status
FROM
    auctions a
    LEFT JOIN profiles p ON a.created_by = p.id
    LEFT JOIN (
        SELECT
            auction_id,
            COUNT(*) as bid_count,
            MIN(amount) as lowest_bid
        FROM auction_bids
        GROUP BY
            auction_id
    ) bid_stats ON a.id = bid_stats.auction_id
WHERE
    a.status = 'active';

-- View for user notifications summary
CREATE OR REPLACE VIEW user_notifications_summary AS
SELECT
    user_id,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (
        WHERE
            is_read = false
    ) as unread_count,
    COUNT(*) FILTER (
        WHERE
            type = 'auction_won'
    ) as auctions_won,
    COUNT(*) FILTER (
        WHERE
            type = 'outbid'
    ) as times_outbid,
    MAX(created_at) as latest_notification
FROM auction_notifications
GROUP BY
    user_id;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Function to get user's relevant auctions (optimized for mobile)
CREATE OR REPLACE FUNCTION get_user_auctions_optimized(
    p_user_id uuid,
    p_limit int DEFAULT 20,
    p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
    auctions_data jsonb;
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM profiles WHERE id = p_user_id;
    
    IF user_role = 'consigner' THEN
        -- Get consigner's own auctions
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id,
                'title', title,
                'status', status,
                'end_time', end_time,
                'bid_count', COALESCE(bid_count, 0),
                'current_lowest_bid', COALESCE(current_lowest_bid, 0)
            ) ORDER BY created_at DESC
        ) INTO auctions_data
        FROM active_auctions_summary
        WHERE created_by = p_user_id
        LIMIT p_limit OFFSET p_offset;
        
    ELSE
        -- Get driver's available auctions
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id,
                'title', title,
                'vehicle_type', vehicle_type,
                'end_time', end_time,
                'bid_count', COALESCE(bid_count, 0),
                'current_lowest_bid', COALESCE(current_lowest_bid, 0),
                'creator_username', creator_username
            ) ORDER BY end_time ASC
        ) INTO auctions_data
        FROM active_auctions_summary
        WHERE calculated_status = 'active'
        LIMIT p_limit OFFSET p_offset;
    END IF;
    
    RETURN COALESCE(auctions_data, '[]'::jsonb);
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION send_push_notification TO authenticated;

GRANT
EXECUTE ON FUNCTION create_notification_with_push TO authenticated;

GRANT EXECUTE ON FUNCTION run_auction_maintenance TO authenticated;

GRANT
EXECUTE ON FUNCTION close_auction_with_notifications TO authenticated;

GRANT
EXECUTE ON FUNCTION get_user_auctions_optimized TO authenticated;

-- Grant view access
GRANT SELECT ON active_auctions_summary TO authenticated;

GRANT SELECT ON user_notifications_summary TO authenticated;