-- Database Views for Optimized Queries
-- This file contains all views for the auction platform
-- Generated from database audit on 2025-01-26

-- =============================================
-- ACTIVE AUCTIONS SUMMARY VIEW
-- =============================================

CREATE OR REPLACE VIEW active_auctions_summary AS
SELECT 
    a.id,
    a.title,
    a.description,
    a.pickup_location,
    a.delivery_location,
    a.pickup_date,
    a.delivery_date,
    a.starting_price,
    a.current_price,
    a.status,
    a.end_time,
    a.created_at,
    a.updated_at,
    -- Creator information
    creator.full_name as creator_name,
    creator.email as creator_email,
    creator.phone as creator_phone,
    -- Winner information (if any)
    winner.full_name as winner_name,
    winner.email as winner_email,
    winner.phone as winner_phone,
    -- Bid statistics
    COALESCE(bid_stats.bid_count, 0) as bid_count,
    COALESCE(bid_stats.highest_bid, a.starting_price) as highest_bid,
    bid_stats.last_bid_time,
    -- Time remaining
    CASE 
        WHEN a.end_time > now() THEN 
            EXTRACT(EPOCH FROM (a.end_time - now()))::INTEGER 
        ELSE 0 
    END as seconds_remaining,
    -- Status flags
    (a.end_time <= now()) as is_expired,
    (a.status = 'active' AND a.end_time > now()) as is_biddable
FROM auctions a
JOIN profiles creator ON a.created_by = creator.id
LEFT JOIN profiles winner ON a.winner_id = winner.id
LEFT JOIN (
    SELECT 
        auction_id,
        COUNT(*) as bid_count,
        MAX(bid_amount) as highest_bid,
        MAX(created_at) as last_bid_time
    FROM auction_bids
    GROUP BY auction_id
) bid_stats ON a.id = bid_stats.auction_id
WHERE a.status IN ('active', 'completed')
ORDER BY 
    CASE WHEN a.status = 'active' THEN 0 ELSE 1 END,
    a.end_time DESC;

-- =============================================
-- USER NOTIFICATIONS SUMMARY VIEW
-- =============================================

CREATE OR REPLACE VIEW user_notifications_summary AS
SELECT 
    n.id,
    n.user_id,
    n.auction_id,
    n.type,
    n.title,
    n.message,
    n.is_read,
    n.created_at,
    -- Auction information
    a.title as auction_title,
    a.status as auction_status,
    a.current_price as auction_current_price,
    -- User information
    u.full_name as user_name,
    u.email as user_email,
    -- Time formatting
    CASE 
        WHEN n.created_at > now() - interval '1 hour' THEN 
            EXTRACT(EPOCH FROM (now() - n.created_at))::INTEGER || ' seconds ago'
        WHEN n.created_at > now() - interval '1 day' THEN 
            EXTRACT(HOUR FROM (now() - n.created_at))::INTEGER || ' hours ago'
        WHEN n.created_at > now() - interval '1 week' THEN 
            EXTRACT(DAY FROM (now() - n.created_at))::INTEGER || ' days ago'
        ELSE 
            to_char(n.created_at, 'Mon DD, YYYY')
    END as time_ago,
    -- Priority scoring for sorting
    CASE 
        WHEN n.type = 'auction_won' THEN 5
        WHEN n.type = 'auction_ending_soon' THEN 4
        WHEN n.type = 'bid_placed' THEN 3
        WHEN n.type = 'auction_completed' THEN 2
        WHEN n.type = 'new_auction' THEN 1
        ELSE 0
    END as priority_score
FROM auction_notifications n
JOIN auctions a ON n.auction_id = a.id
JOIN profiles u ON n.user_id = u.id
ORDER BY 
    n.is_read ASC,
    priority_score DESC,
    n.created_at DESC;

-- =============================================
-- AUCTION BIDDING SUMMARY VIEW
-- =============================================

CREATE OR REPLACE VIEW auction_bidding_summary AS
SELECT 
    a.id as auction_id,
    a.title,
    a.current_price,
    a.end_time,
    a.status,
    -- Bidding statistics
    COUNT(DISTINCT ab.user_id) as unique_bidders,
    COUNT(ab.id) as total_bids,
    MAX(ab.bid_amount) as highest_bid,
    MIN(ab.bid_amount) as lowest_bid,
    AVG(ab.bid_amount) as average_bid,
    -- Latest bid information
    latest_bid.bid_amount as latest_bid_amount,
    latest_bid.created_at as latest_bid_time,
    latest_bidder.full_name as latest_bidder_name,
    -- Bid progression
    CASE 
        WHEN COUNT(ab.id) > 0 THEN 
            ((MAX(ab.bid_amount) - a.starting_price) / a.starting_price * 100)::DECIMAL(5,2)
        ELSE 0 
    END as price_increase_percentage,
    -- Time analysis
    CASE 
        WHEN a.end_time > now() THEN 
            ROUND(EXTRACT(EPOCH FROM (a.end_time - now())) / 3600, 2)
        ELSE 0 
    END as hours_remaining
FROM auctions a
LEFT JOIN auction_bids ab ON a.id = ab.auction_id
LEFT JOIN (
    SELECT DISTINCT ON (auction_id) 
        auction_id, user_id, bid_amount, created_at
    FROM auction_bids 
    ORDER BY auction_id, created_at DESC
) latest_bid ON a.id = latest_bid.auction_id
LEFT JOIN profiles latest_bidder ON latest_bid.user_id = latest_bidder.id
GROUP BY 
    a.id, a.title, a.current_price, a.end_time, a.status, a.starting_price,
    latest_bid.bid_amount, latest_bid.created_at, latest_bidder.full_name
ORDER BY a.created_at DESC;

-- =============================================
-- USER ACTIVITY SUMMARY VIEW
-- =============================================

CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    p.role,
    p.created_at as user_since,
    -- Auction activity for consigners
    CASE WHEN p.role = 'consigner' THEN
        (SELECT COUNT(*) FROM auctions WHERE created_by = p.id)
    ELSE 0 END as auctions_created,
    CASE WHEN p.role = 'consigner' THEN
        (SELECT COUNT(*) FROM auctions WHERE created_by = p.id AND status = 'completed')
    ELSE 0 END as auctions_completed,
    -- Bidding activity for drivers  
    CASE WHEN p.role = 'driver' THEN
        (SELECT COUNT(*) FROM auction_bids WHERE user_id = p.id)
    ELSE 0 END as bids_placed,
    CASE WHEN p.role = 'driver' THEN
        (SELECT COUNT(*) FROM auctions WHERE winner_id = p.id)
    ELSE 0 END as auctions_won,
    -- Notification activity
    (SELECT COUNT(*) FROM auction_notifications WHERE user_id = p.id) as total_notifications,
    (SELECT COUNT(*) FROM auction_notifications WHERE user_id = p.id AND is_read = false) as unread_notifications,
    -- Recent activity
    (SELECT MAX(created_at) FROM auction_audit_logs WHERE user_id = p.id) as last_activity,
    -- Push notification status
    CASE WHEN p.push_token IS NOT NULL THEN true ELSE false END as has_push_notifications
FROM profiles p
ORDER BY 
    CASE WHEN p.role = 'consigner' THEN 
        (SELECT COUNT(*) FROM auctions WHERE created_by = p.id)
    ELSE 
        (SELECT COUNT(*) FROM auction_bids WHERE user_id = p.id)
    END DESC;
