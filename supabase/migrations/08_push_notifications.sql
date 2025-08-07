-- Push Notification System and External API Integration
-- This file contains functions for push notifications and external API calls
-- Generated from database audit on 2025-01-26

-- =============================================
-- PUSH NOTIFICATION FUNCTIONS
-- =============================================

-- Function to send push notification via HTTP
CREATE OR REPLACE FUNCTION send_push_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    push_token TEXT;
    notification_payload JSONB;
    http_response RECORD;
    expo_url TEXT := 'https://exp.host/--/api/v2/push/send';
BEGIN
    -- Get user's push token
    SELECT profiles.push_token INTO push_token
    FROM profiles
    WHERE profiles.id = p_user_id;
    
    -- Return false if no push token
    IF push_token IS NULL OR push_token = '' THEN
        RETURN FALSE;
    END IF;
    
    -- Build notification payload
    notification_payload := jsonb_build_object(
        'to', push_token,
        'title', p_title,
        'body', p_message,
        'data', p_data,
        'sound', 'default',
        'priority', 'high'
    );
    
    -- Send HTTP request to Expo Push API
    SELECT * INTO http_response
    FROM http((
        'POST',
        expo_url,
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Accept', 'application/json')
        ],
        'application/json',
        notification_payload::TEXT
    )::http_request);
    
    -- Check if request was successful
    IF http_response.status BETWEEN 200 AND 299 THEN
        RETURN TRUE;
    ELSE
        -- Log the error for debugging
        RAISE WARNING 'Push notification failed: Status %, Response: %', 
            http_response.status, http_response.content;
        RETURN FALSE;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Push notification error: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Function to send notification with database logging
CREATE OR REPLACE FUNCTION send_notification_with_push(
    p_user_id UUID,
    p_auction_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id UUID;
    push_sent BOOLEAN;
BEGIN
    -- Create database notification
    INSERT INTO auction_notifications (user_id, auction_id, type, title, message)
    VALUES (p_user_id, p_auction_id, p_type, p_title, p_message)
    RETURNING id INTO notification_id;
    
    -- Send push notification
    SELECT send_push_notification(p_user_id, p_title, p_message, 
           p_data || jsonb_build_object('notification_id', notification_id))
    INTO push_sent;
    
    RETURN push_sent;
END;
$$;

-- Function to broadcast notification to multiple users
CREATE OR REPLACE FUNCTION broadcast_notification(
    p_user_ids UUID[],
    p_auction_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    success_count INTEGER := 0;
    notification_sent BOOLEAN;
BEGIN
    -- Send to each user
    FOREACH user_id IN ARRAY p_user_ids
    LOOP
        SELECT send_notification_with_push(
            user_id, p_auction_id, p_type, p_title, p_message, p_data
        ) INTO notification_sent;
        
        IF notification_sent THEN
            success_count := success_count + 1;
        END IF;
    END LOOP;
    
    RETURN success_count;
END;
$$;

-- =============================================
-- NOTIFICATION TRIGGER FUNCTIONS WITH PUSH
-- =============================================

-- Enhanced bid notification function with push
CREATE OR REPLACE FUNCTION notify_bid_placed_with_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auction_title TEXT;
    consigner_id UUID;
    bidder_name TEXT;
    bid_amount DECIMAL;
    other_bidders UUID[];
    notification_data JSONB;
BEGIN
    -- Get auction and bidder details
    SELECT a.title, a.created_by, p.full_name, NEW.bid_amount
    INTO auction_title, consigner_id, bidder_name, bid_amount
    FROM auctions a
    JOIN profiles p ON NEW.user_id = p.id
    WHERE a.id = NEW.auction_id;
    
    -- Prepare notification data
    notification_data := jsonb_build_object(
        'auction_id', NEW.auction_id,
        'bid_amount', bid_amount,
        'bidder_name', bidder_name,
        'type', 'bid_placed'
    );
    
    -- Notify auction creator
    PERFORM send_notification_with_push(
        consigner_id,
        NEW.auction_id,
        'bid_placed',
        'New Bid on Your Auction',
        bidder_name || ' placed a bid of $' || bid_amount || ' on "' || auction_title || '"',
        notification_data
    );
    
    -- Get other bidders to notify
    SELECT array_agg(DISTINCT ab.user_id)
    INTO other_bidders
    FROM auction_bids ab
    WHERE ab.auction_id = NEW.auction_id 
    AND ab.user_id != NEW.user_id
    AND ab.bid_amount < NEW.bid_amount;
    
    -- Notify other bidders
    IF other_bidders IS NOT NULL AND array_length(other_bidders, 1) > 0 THEN
        PERFORM broadcast_notification(
            other_bidders,
            NEW.auction_id,
            'bid_placed',
            'You''ve Been Outbid',
            'A higher bid of $' || bid_amount || ' was placed on "' || auction_title || '"',
            notification_data
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Enhanced auction completion notification with push
CREATE OR REPLACE FUNCTION notify_auction_completed_with_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auction_title TEXT;
    winner_name TEXT;
    winning_amount DECIMAL;
    other_bidders UUID[];
    notification_data JSONB;
BEGIN
    -- Only trigger on status change to completed
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        SELECT title INTO auction_title FROM auctions WHERE id = NEW.id;
        
        -- Prepare base notification data
        notification_data := jsonb_build_object(
            'auction_id', NEW.id,
            'auction_title', auction_title,
            'type', 'auction_completed'
        );
        
        -- If there's a winner
        IF NEW.winner_id IS NOT NULL THEN
            SELECT full_name INTO winner_name FROM profiles WHERE id = NEW.winner_id;
            SELECT current_price INTO winning_amount FROM auctions WHERE id = NEW.id;
            
            -- Add winner data
            notification_data := notification_data || jsonb_build_object(
                'winner_id', NEW.winner_id,
                'winner_name', winner_name,
                'winning_amount', winning_amount
            );
            
            -- Notify winner
            PERFORM send_notification_with_push(
                NEW.winner_id,
                NEW.id,
                'auction_won',
                'Congratulations! You Won!',
                'You won the auction "' || auction_title || '" with a bid of $' || winning_amount,
                notification_data || jsonb_build_object('is_winner', true)
            );
            
            -- Notify creator
            PERFORM send_notification_with_push(
                NEW.created_by,
                NEW.id,
                'auction_completed',
                'Your Auction Completed',
                'Your auction "' || auction_title || '" was won by ' || winner_name || ' for $' || winning_amount,
                notification_data || jsonb_build_object('is_creator', true)
            );
            
            -- Get other bidders to notify
            SELECT array_agg(DISTINCT ab.user_id)
            INTO other_bidders
            FROM auction_bids ab
            WHERE ab.auction_id = NEW.id 
            AND ab.user_id != NEW.winner_id;
            
            -- Notify other bidders
            IF other_bidders IS NOT NULL AND array_length(other_bidders, 1) > 0 THEN
                PERFORM broadcast_notification(
                    other_bidders,
                    NEW.id,
                    'auction_completed',
                    'Auction Ended',
                    'The auction "' || auction_title || '" ended. It was won by ' || winner_name || ' for $' || winning_amount,
                    notification_data
                );
            END IF;
        ELSE
            -- Notify creator - no winner
            PERFORM send_notification_with_push(
                NEW.created_by,
                NEW.id,
                'auction_completed',
                'Your Auction Ended',
                'Your auction "' || auction_title || '" ended with no winning bids',
                notification_data || jsonb_build_object('is_creator', true, 'no_winner', true)
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Enhanced ending soon notification with push
CREATE OR REPLACE FUNCTION notify_auction_ending_soon_with_push()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auction_record RECORD;
    active_bidders UUID[];
    notification_count INTEGER := 0;
    notification_data JSONB;
BEGIN
    -- Find auctions ending in the next 30 minutes
    FOR auction_record IN
        SELECT a.id, a.title, a.created_by, a.end_time, a.current_price
        FROM auctions a
        WHERE a.status = 'active'
        AND a.end_time BETWEEN now() AND now() + interval '30 minutes'
        AND NOT EXISTS (
            SELECT 1 FROM auction_notifications 
            WHERE auction_id = a.id 
            AND type = 'auction_ending_soon' 
            AND created_at > now() - interval '1 hour'
        )
    LOOP
        -- Prepare notification data
        notification_data := jsonb_build_object(
            'auction_id', auction_record.id,
            'auction_title', auction_record.title,
            'current_price', auction_record.current_price,
            'end_time', auction_record.end_time,
            'type', 'auction_ending_soon'
        );
        
        -- Notify auction creator
        PERFORM send_notification_with_push(
            auction_record.created_by,
            auction_record.id,
            'auction_ending_soon',
            'Auction Ending Soon',
            'Your auction "' || auction_record.title || '" ends in less than 30 minutes',
            notification_data || jsonb_build_object('is_creator', true)
        );
        
        -- Get active bidders
        SELECT array_agg(DISTINCT ab.user_id)
        INTO active_bidders
        FROM auction_bids ab
        WHERE ab.auction_id = auction_record.id;
        
        -- Notify active bidders
        IF active_bidders IS NOT NULL AND array_length(active_bidders, 1) > 0 THEN
            PERFORM broadcast_notification(
                active_bidders,
                auction_record.id,
                'auction_ending_soon',
                'Auction Ending Soon',
                'The auction "' || auction_record.title || '" ends in less than 30 minutes',
                notification_data
            );
        END IF;
        
        notification_count := notification_count + 1;
    END LOOP;
    
    RETURN notification_count;
END;
$$;

-- =============================================
-- UTILITY FUNCTIONS FOR PUSH TOKENS
-- =============================================

-- Function to update user push token
CREATE OR REPLACE FUNCTION update_push_token(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles 
    SET push_token = p_token, updated_at = now()
    WHERE id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- Function to get push notification statistics
CREATE OR REPLACE FUNCTION get_push_notification_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM profiles),
        'users_with_push_tokens', (SELECT COUNT(*) FROM profiles WHERE push_token IS NOT NULL AND push_token != ''),
        'notifications_last_24h', (SELECT COUNT(*) FROM auction_notifications WHERE created_at > now() - interval '24 hours'),
        'unread_notifications', (SELECT COUNT(*) FROM auction_notifications WHERE is_read = false),
        'active_auctions', (SELECT COUNT(*) FROM auctions WHERE status = 'active' AND end_time > now())
    ) INTO stats;
    
    RETURN stats;
END;
$$;

-- Function to test push notification
CREATE OR REPLACE FUNCTION test_push_notification()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN send_push_notification(
        auth.uid(),
        'Test Notification',
        'This is a test push notification from Airavatl',
        jsonb_build_object('test', true, 'timestamp', now())
    );
END;
$$;
