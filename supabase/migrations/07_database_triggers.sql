-- Database Triggers and Automation
-- This file contains all triggers for the auction platform
-- Generated from database audit on 2025-01-26

-- =============================================
-- AUTHENTICATION TRIGGERS
-- =============================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'driver')
    );
    RETURN NEW;
END;
$$;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-confirm users (disable email confirmation)
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.email_confirmed_at = now();
    NEW.confirmed_at = now();
    RETURN NEW;
END;
$$;

-- Trigger for auto-confirming users
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();

-- =============================================
-- AUCTION NOTIFICATION TRIGGERS
-- =============================================

-- Function to handle bid notifications
CREATE OR REPLACE FUNCTION notify_bid_placed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auction_title TEXT;
    consigner_id UUID;
    bidder_name TEXT;
    bid_amount DECIMAL;
BEGIN
    -- Get auction and bidder details
    SELECT a.title, a.created_by, p.full_name, NEW.bid_amount
    INTO auction_title, consigner_id, bidder_name, bid_amount
    FROM auctions a
    JOIN profiles p ON NEW.user_id = p.id
    WHERE a.id = NEW.auction_id;
    
    -- Notify auction creator
    INSERT INTO auction_notifications (user_id, auction_id, type, title, message)
    VALUES (
        consigner_id,
        NEW.auction_id,
        'bid_placed',
        'New Bid on Your Auction',
        bidder_name || ' placed a bid of $' || bid_amount || ' on "' || auction_title || '"'
    );
    
    -- Notify other bidders (except the current bidder)
    INSERT INTO auction_notifications (user_id, auction_id, type, title, message)
    SELECT DISTINCT 
        ab.user_id,
        NEW.auction_id,
        'bid_placed',
        'You''ve Been Outbid',
        'A higher bid of $' || bid_amount || ' was placed on "' || auction_title || '"'
    FROM auction_bids ab
    WHERE ab.auction_id = NEW.auction_id 
    AND ab.user_id != NEW.user_id
    AND ab.bid_amount < NEW.bid_amount;
    
    RETURN NEW;
END;
$$;

-- Trigger for bid notifications
DROP TRIGGER IF EXISTS trigger_bid_notifications ON auction_bids;
CREATE TRIGGER trigger_bid_notifications
    AFTER INSERT OR UPDATE ON auction_bids
    FOR EACH ROW EXECUTE FUNCTION notify_bid_placed();

-- Function to handle auction completion notifications
CREATE OR REPLACE FUNCTION notify_auction_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auction_title TEXT;
    winner_name TEXT;
    winning_amount DECIMAL;
BEGIN
    -- Only trigger on status change to completed
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        SELECT title INTO auction_title FROM auctions WHERE id = NEW.id;
        
        -- If there's a winner
        IF NEW.winner_id IS NOT NULL THEN
            SELECT full_name INTO winner_name FROM profiles WHERE id = NEW.winner_id;
            SELECT current_price INTO winning_amount FROM auctions WHERE id = NEW.id;
            
            -- Notify winner
            INSERT INTO auction_notifications (user_id, auction_id, type, title, message)
            VALUES (
                NEW.winner_id,
                NEW.id,
                'auction_won',
                'Congratulations! You Won!',
                'You won the auction "' || auction_title || '" with a bid of $' || winning_amount
            );
            
            -- Notify creator
            INSERT INTO auction_notifications (user_id, auction_id, type, title, message)
            VALUES (
                NEW.created_by,
                NEW.id,
                'auction_completed',
                'Your Auction Completed',
                'Your auction "' || auction_title || '" was won by ' || winner_name || ' for $' || winning_amount
            );
            
            -- Notify other bidders
            INSERT INTO auction_notifications (user_id, auction_id, type, title, message)
            SELECT DISTINCT 
                ab.user_id,
                NEW.id,
                'auction_completed',
                'Auction Ended',
                'The auction "' || auction_title || '" ended. It was won by ' || winner_name || ' for $' || winning_amount
            FROM auction_bids ab
            WHERE ab.auction_id = NEW.id 
            AND ab.user_id != NEW.winner_id;
        ELSE
            -- Notify creator - no winner
            INSERT INTO auction_notifications (user_id, auction_id, type, title, message)
            VALUES (
                NEW.created_by,
                NEW.id,
                'auction_completed',
                'Your Auction Ended',
                'Your auction "' || auction_title || '" ended with no winning bids'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for auction completion notifications
DROP TRIGGER IF EXISTS trigger_auction_completion_notifications ON auctions;
CREATE TRIGGER trigger_auction_completion_notifications
    AFTER UPDATE ON auctions
    FOR EACH ROW EXECUTE FUNCTION notify_auction_completed();

-- Function to notify about expiring auctions
CREATE OR REPLACE FUNCTION notify_auction_ending_soon()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auction_record RECORD;
    notification_count INTEGER := 0;
BEGIN
    -- Find auctions ending in the next 30 minutes that haven't been notified recently
    FOR auction_record IN
        SELECT a.id, a.title, a.created_by, a.end_time
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
        -- Notify auction creator
        INSERT INTO auction_notifications (user_id, auction_id, type, title, message)
        VALUES (
            auction_record.created_by,
            auction_record.id,
            'auction_ending_soon',
            'Auction Ending Soon',
            'Your auction "' || auction_record.title || '" ends in less than 30 minutes'
        );
        
        -- Notify active bidders
        INSERT INTO auction_notifications (user_id, auction_id, type, title, message)
        SELECT DISTINCT 
            ab.user_id,
            auction_record.id,
            'auction_ending_soon',
            'Auction Ending Soon',
            'The auction "' || auction_record.title || '" ends in less than 30 minutes'
        FROM auction_bids ab
        WHERE ab.auction_id = auction_record.id;
        
        notification_count := notification_count + 1;
    END LOOP;
    
    RETURN notification_count;
END;
$$;

-- =============================================
-- TIMESTAMP UPDATE TRIGGERS
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Triggers for timestamp updates
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_auctions_updated_at ON auctions;
CREATE TRIGGER update_auctions_updated_at
    BEFORE UPDATE ON auctions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- AUDIT LOGGING TRIGGERS  
-- =============================================

-- Function to log auction changes
CREATE OR REPLACE FUNCTION log_auction_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    action_type TEXT;
    old_values JSONB;
    new_values JSONB;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'created';
        old_values := NULL;
        new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'updated';
        old_values := to_jsonb(OLD);
        new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'deleted';
        old_values := to_jsonb(OLD);
        new_values := NULL;
    END IF;
    
    -- Log the change
    INSERT INTO auction_audit_logs (
        auction_id, 
        user_id, 
        action, 
        old_values, 
        new_values
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        auth.uid(),
        action_type,
        old_values,
        new_values
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for auction audit logging
DROP TRIGGER IF EXISTS trigger_auction_audit ON auctions;
CREATE TRIGGER trigger_auction_audit
    AFTER INSERT OR UPDATE OR DELETE ON auctions
    FOR EACH ROW EXECUTE FUNCTION log_auction_changes();

-- =============================================
-- SCHEDULED MAINTENANCE FUNCTIONS
-- =============================================

-- Function to perform automated maintenance
CREATE OR REPLACE FUNCTION automated_maintenance()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
    notification_count INTEGER;
    result_message TEXT;
BEGIN
    -- Complete expired auctions
    SELECT cleanup_expired_auctions() INTO expired_count;
    
    -- Send ending soon notifications
    SELECT notify_auction_ending_soon() INTO notification_count;
    
    -- Clean up old notifications (older than 30 days)
    DELETE FROM auction_notifications 
    WHERE created_at < now() - interval '30 days';
    
    -- Clean up old audit logs (older than 90 days)
    DELETE FROM auction_audit_logs 
    WHERE created_at < now() - interval '90 days';
    
    result_message := format(
        'Maintenance completed: %s expired auctions, %s ending notifications sent',
        expired_count,
        notification_count
    );
    
    RETURN result_message;
END;
$$;
