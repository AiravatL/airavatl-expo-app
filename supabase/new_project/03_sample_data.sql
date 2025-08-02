/*
# Sample Data and Testing
# Version: 2.0
# Date: August 2, 2025

Sample data for testing the auction platform:
- Test users (consigners and drivers)
- Sample auctions
- Test bids and scenarios
- Performance testing data
*/

-- ============================================================================
-- SAMPLE USERS
-- ============================================================================

-- Note: In a real Supabase setup, users would be created through auth.users
-- This is just for the profiles data structure

-- Sample profiles (assuming auth.users already exist)
INSERT INTO profiles (id, username, role, phone_number, address, vehicle_type, bio) VALUES
-- Consigners
('11111111-1111-1111-1111-111111111111', 'rajesh_logistics', 'consigner', '9876543210', 
 'Sector 15, Gurgaon, Haryana', NULL, 'Experienced logistics business owner with 10+ years in cargo transport.'),

('22222222-2222-2222-2222-222222222222', 'priya_transport', 'consigner', '9876543211',
 'Andheri East, Mumbai, Maharashtra', NULL, 'Small transport business specializing in last-mile delivery.'),

('33333333-3333-3333-3333-333333333333', 'kumar_cargo', 'consigner', '9876543212',
 'Electronic City, Bangalore, Karnataka', NULL, 'E-commerce fulfillment and warehousing services.'),

-- Drivers  
('44444444-4444-4444-4444-444444444444', 'amit_driver', 'driver', '9876543213',
 'Lajpat Nagar, New Delhi', 'pickup_truck', 'Reliable driver with 5 years experience. Own Tata Ace.'),

('55555555-5555-5555-5555-555555555555', 'suresh_pickup', 'driver', '9876543214', 
 'Koramangala, Bangalore, Karnataka', 'mini_truck', 'Professional driver with clean driving record. Mahindra Bolero Pickup.'),

('66666666-6666-6666-6666-666666666666', 'ravi_transport', 'driver', '9876543215',
 'Bandra West, Mumbai, Maharashtra', 'medium_truck', 'Commercial vehicle operator with 8 years experience.'),

('77777777-7777-7777-7777-777777777777', 'dinesh_logistics', 'driver', '9876543216',
 'Sector 22, Gurgaon, Haryana', 'large_truck', 'Heavy vehicle specialist. Available for long-distance transport.'),

('88888888-8888-8888-8888-888888888888', 'vijay_auto', 'driver', '9876543217',
 'Malviya Nagar, Jaipur, Rajasthan', 'three_wheeler', 'Auto rickshaw driver available for small packages.');

-- ============================================================================
-- SAMPLE AUCTIONS
-- ============================================================================

-- Active auctions
INSERT INTO auctions (id, title, description, vehicle_type, start_time, end_time, consignment_date, created_by, status) VALUES

-- Active auction 1 - ending soon
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
 'Urgent Electronics Delivery - Gurgaon to Noida',
 'Need pickup truck for transporting 50 mobile phone boxes (fragile items). Total weight: 200kg. Pickup from Sector 15 Gurgaon, delivery to Sector 62 Noida. Loading/unloading assistance required.',
 'pickup_truck',
 now() - interval '2 hours',
 now() + interval '30 minutes', 
 now() + interval '1 day',
 '11111111-1111-1111-1111-111111111111',
 'active'),

-- Active auction 2 - medium duration
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 'Furniture Transport - Mumbai Local',
 'Household furniture shifting within Mumbai. 3BHK apartment. Includes sofa set, dining table, wardrobe, and miscellaneous items. Weight: ~800kg. Professional handling required.',
 'mini_truck',
 now() - interval '1 hour',
 now() + interval '4 hours',
 now() + interval '2 days', 
 '22222222-2222-2222-2222-222222222222',
 'active'),

-- Active auction 3 - just started
('cccccccc-cccc-cccc-cccc-cccccccccccc',
 'Medical Equipment Delivery - Bangalore to Mysore', 
 'Temperature-sensitive medical equipment transport. Requires covered vehicle with climate control. Distance: 150km. Delivery by evening mandatory.',
 'medium_truck',
 now() - interval '15 minutes',
 now() + interval '6 hours',
 now() + interval '1 day',
 '33333333-3333-3333-3333-333333333333', 
 'active'),

-- Active auction 4 - long duration
('dddddddd-dddd-dddd-dddd-dddddddddddd',
 'Construction Materials - Delhi to Jaipur',
 'Building materials including cement bags, steel rods, and tiles. Total weight: 2 tons. Heavy vehicle required. Route: Delhi to Jaipur (280km).',
 'large_truck', 
 now() + interval '30 minutes',
 now() + interval '24 hours',
 now() + interval '3 days',
 '11111111-1111-1111-1111-111111111111',
 'active'),

-- Recently completed auction
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 'Document Courier - Local Delhi',
 'Important legal documents delivery. Multiple stops in South Delhi. Total 15 packages. Immediate requirement.',
 'three_wheeler',
 now() - interval '3 hours', 
 now() - interval '1 hour',
 now() + interval '4 hours',
 '22222222-2222-2222-2222-222222222222',
 'completed');

-- ============================================================================
-- SAMPLE BIDS
-- ============================================================================

-- Bids for urgent electronics delivery (auction a)
INSERT INTO auction_bids (auction_id, user_id, amount) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 1200.00),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 1100.00), -- This will be winning
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 1300.00);

-- Bids for furniture transport (auction b)  
INSERT INTO auction_bids (auction_id, user_id, amount) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 2500.00), -- This will be winning
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 2800.00),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 2700.00);

-- Bids for medical equipment (auction c)
INSERT INTO auction_bids (auction_id, user_id, amount) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', 3500.00), -- This will be winning
('cccccccc-cccc-cccc-cccc-cccccccccccc', '77777777-7777-7777-7777-777777777777', 3800.00);

-- Bids for construction materials (auction d) - few bids so far
INSERT INTO auction_bids (auction_id, user_id, amount) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '77777777-7777-7777-7777-777777777777', 8500.00); -- Only one bid so far

-- Bids for completed document courier (auction e)
INSERT INTO auction_bids (auction_id, user_id, amount) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '88888888-8888-8888-8888-888888888888', 300.00), -- This won
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '44444444-4444-4444-4444-444444444444', 350.00);

-- Update completed auction with winner
UPDATE auctions SET 
    winner_id = '88888888-8888-8888-8888-888888888888',
    winning_bid_id = (SELECT id FROM auction_bids WHERE auction_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' AND amount = 300.00)
WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

-- Update winning bid flags
UPDATE auction_bids SET is_winning_bid = true WHERE 
    auction_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND amount = 1100.00;

UPDATE auction_bids SET is_winning_bid = true WHERE
    auction_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AND amount = 2500.00;
    
UPDATE auction_bids SET is_winning_bid = true WHERE
    auction_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' AND amount = 3500.00;
    
UPDATE auction_bids SET is_winning_bid = true WHERE 
    auction_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' AND amount = 8500.00;

UPDATE auction_bids SET is_winning_bid = true WHERE
    auction_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' AND amount = 300.00;

-- ============================================================================
-- SAMPLE NOTIFICATIONS
-- ============================================================================

-- Sample notifications for different scenarios
INSERT INTO auction_notifications (user_id, auction_id, type, message, is_read) VALUES

-- Notifications for consigners
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
 'bid_placed', 'New bid of ₹1200 placed on your auction "Urgent Electronics Delivery"', false),

('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 'bid_placed', 'New bid of ₹2500 placed on your auction "Furniture Transport"', false),

('22222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 'auction_completed', 'Your auction "Document Courier" was won by vijay_auto for ₹300', true),

-- Notifications for drivers  
('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 'outbid', 'You have been outbid on "Urgent Electronics Delivery". Current lowest bid: ₹1100', false),

('88888888-8888-8888-8888-888888888888', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 
 'auction_won', 'Congratulations! You won "Document Courier" with a bid of ₹300', true),

('77777777-7777-7777-7777-777777777777', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
 'outbid', 'You have been outbid on "Medical Equipment Delivery". Current lowest bid: ₹3500', false);

-- ============================================================================
-- SAMPLE AUDIT LOGS
-- ============================================================================

-- Sample audit entries
INSERT INTO auction_audit_logs (auction_id, user_id, action, details) VALUES

('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 
 'auction_created', '{"title": "Urgent Electronics Delivery - Gurgaon to Noida", "vehicle_type": "pickup_truck"}'),

('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444',
 'bid_placed', '{"amount": 1200, "bid_id": "sample-bid-id-1"}'),

('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555',
 'bid_placed', '{"amount": 1100, "bid_id": "sample-bid-id-2"}'),

('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '88888888-8888-8888-8888-888888888888',
 'auction_completed', '{"winner_id": "88888888-8888-8888-8888-888888888888", "winning_amount": 300}');

-- ============================================================================
-- DATA VERIFICATION QUERIES
-- ============================================================================

-- These are useful for testing - comment out in production

-- Check user distribution
-- SELECT role, COUNT(*) as user_count FROM profiles GROUP BY role;

-- Check auction status distribution  
-- SELECT status, COUNT(*) as auction_count FROM auctions GROUP BY status;

-- Check bidding activity
-- SELECT a.title, COUNT(b.id) as bid_count, MIN(b.amount) as lowest_bid 
-- FROM auctions a LEFT JOIN auction_bids b ON a.id = b.auction_id 
-- GROUP BY a.id, a.title ORDER BY bid_count DESC;

-- Check notification types
-- SELECT type, COUNT(*) as notification_count FROM auction_notifications GROUP BY type;

-- ============================================================================
-- PERFORMANCE TEST DATA (Optional)
-- ============================================================================

-- Uncomment below to generate larger dataset for performance testing

/*
-- Generate additional test users
INSERT INTO profiles (id, username, role, phone_number, vehicle_type)
SELECT 
    uuid_generate_v4(),
    'driver_' || generate_series,
    'driver',
    '987654' || LPAD(generate_series::text, 4, '0'),
    (ARRAY['pickup_truck', 'mini_truck', 'medium_truck'])[floor(random() * 3 + 1)]
FROM generate_series(1000, 1100);

-- Generate additional test auctions
INSERT INTO auctions (title, description, vehicle_type, start_time, end_time, consignment_date, created_by)
SELECT 
    'Test Auction ' || generate_series,
    'Sample auction description for performance testing',
    (ARRAY['pickup_truck', 'mini_truck', 'medium_truck'])[floor(random() * 3 + 1)],
    now() - interval '1 hour',
    now() + interval '1 day', 
    now() + interval '2 days',
    '11111111-1111-1111-1111-111111111111'
FROM generate_series(1, 50);
*/
