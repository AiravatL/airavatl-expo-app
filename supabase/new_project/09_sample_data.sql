-- Sample Data for Testing and Development
-- This file contains sample data to populate the database for testing
-- Generated from database audit on 2025-01-26

-- =============================================
-- SAMPLE PROFILES (USERS)
-- =============================================

-- Insert sample consigners
INSERT INTO profiles (id, email, full_name, phone, role, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'john.consigner@airavatl.com', 'John Consigner', '+1-555-0101', 'consigner', now() - interval '30 days'),
('22222222-2222-2222-2222-222222222222', 'sarah.shipper@airavatl.com', 'Sarah Shipper', '+1-555-0102', 'consigner', now() - interval '25 days'),
('33333333-3333-3333-3333-333333333333', 'mike.merchant@airavatl.com', 'Mike Merchant', '+1-555-0103', 'consigner', now() - interval '20 days')
ON CONFLICT (id) DO NOTHING;

-- Insert sample drivers
INSERT INTO profiles (id, email, full_name, phone, role, vehicle_type, driver_license, created_at) VALUES
('44444444-4444-4444-4444-444444444444', 'alex.driver@airavatl.com', 'Alex Driver', '+1-555-0201', 'driver', 'Pickup Truck', 'DL123456789', now() - interval '28 days'),
('55555555-5555-5555-5555-555555555555', 'lisa.logistics@airavatl.com', 'Lisa Logistics', '+1-555-0202', 'driver', 'Van', 'DL987654321', now() - interval '26 days'),
('66666666-6666-6666-6666-666666666666', 'carlos.carrier@airavatl.com', 'Carlos Carrier', '+1-555-0203', 'driver', 'Box Truck', 'DL456789123', now() - interval '24 days'),
('77777777-7777-7777-7777-777777777777', 'emma.express@airavatl.com', 'Emma Express', '+1-555-0204', 'driver', 'Sedan', 'DL321654987', now() - interval '22 days'),
('88888888-8888-8888-8888-888888888888', 'david.delivery@airavatl.com', 'David Delivery', '+1-555-0205', 'driver', 'SUV', 'DL789123456', now() - interval '18 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SAMPLE AUCTIONS
-- =============================================

-- Active auctions
INSERT INTO auctions (id, title, description, pickup_location, delivery_location, pickup_date, delivery_date, starting_price, current_price, status, created_by, end_time, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
 'Furniture Delivery - Downtown to Suburbs', 
 'Need to move a 3-piece living room set from downtown showroom to residential address. Includes sofa, loveseat, and coffee table. Careful handling required.',
 '123 Main St, Downtown, Atlanta, GA 30309',
 '456 Oak Ave, Marietta, GA 30060',
 now() + interval '2 days',
 now() + interval '3 days',
 75.00,
 95.00,
 'active',
 '11111111-1111-1111-1111-111111111111',
 now() + interval '12 hours',
 now() - interval '2 days'),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 'Electronics Shipment - Express Delivery',
 'Urgent delivery of computer equipment from warehouse to office. Fragile items, insurance coverage required.',
 '789 Industrial Blvd, Warehouse District, Atlanta, GA 30318',
 '321 Business Park Dr, Sandy Springs, GA 30328',
 now() + interval '1 day',
 now() + interval '1 day',
 120.00,
 150.00,
 'active',
 '22222222-2222-2222-2222-222222222222',
 now() + interval '8 hours',
 now() - interval '1 day'),

('cccccccc-cccc-cccc-cccc-cccccccccccc',
 'Art Gallery Transport',
 'Transport of framed artwork from gallery to private residence. White glove service required.',
 '555 Art District Way, Atlanta, GA 30309',
 '777 Peachtree Hills Ave, Atlanta, GA 30305',
 now() + interval '3 days',
 now() + interval '4 days',
 200.00,
 200.00,
 'active',
 '33333333-3333-3333-3333-333333333333',
 now() + interval '2 days',
 now() - interval '6 hours')
ON CONFLICT (id) DO NOTHING;

-- Completed auctions
INSERT INTO auctions (id, title, description, pickup_location, delivery_location, pickup_date, delivery_date, starting_price, current_price, status, created_by, winner_id, end_time, created_at) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd',
 'Appliance Delivery - Refrigerator',
 'Delivery of new refrigerator from store to customer home. Ground floor delivery.',
 '999 Appliance Store Rd, Decatur, GA 30030',
 '111 Residential St, Stone Mountain, GA 30083',
 now() - interval '1 day',
 now(),
 100.00,
 140.00,
 'completed',
 '11111111-1111-1111-1111-111111111111',
 '44444444-4444-4444-4444-444444444444',
 now() - interval '2 hours',
 now() - interval '3 days'),

('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 'Office Relocation - Small Items',
 'Moving boxes of office supplies and documents. Multiple trips may be required.',
 '888 Old Office Blvd, Atlanta, GA 30309',
 '222 New Office Complex, Buckhead, GA 30305',
 now() - interval '2 days',
 now() - interval '1 day',
 80.00,
 110.00,
 'completed',
 '22222222-2222-2222-2222-222222222222',
 '55555555-5555-5555-5555-555555555555',
 now() - interval '1 day',
 now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SAMPLE AUCTION BIDS
-- =============================================

-- Bids for active auction A
INSERT INTO auction_bids (auction_id, user_id, bid_amount, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 80.00, now() - interval '36 hours'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 85.00, now() - interval '30 hours'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 90.00, now() - interval '24 hours'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 95.00, now() - interval '18 hours')
ON CONFLICT (auction_id, user_id) DO UPDATE SET bid_amount = EXCLUDED.bid_amount, created_at = EXCLUDED.created_at;

-- Bids for active auction B
INSERT INTO auction_bids (auction_id, user_id, bid_amount, created_at) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 125.00, now() - interval '20 hours'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '88888888-8888-8888-8888-888888888888', 130.00, now() - interval '15 hours'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 140.00, now() - interval '12 hours'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 150.00, now() - interval '8 hours')
ON CONFLICT (auction_id, user_id) DO UPDATE SET bid_amount = EXCLUDED.bid_amount, created_at = EXCLUDED.created_at;

-- Bids for completed auctions
INSERT INTO auction_bids (auction_id, user_id, bid_amount, created_at) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', 105.00, now() - interval '3 days'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666', 120.00, now() - interval '2 days 18 hours'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 140.00, now() - interval '2 days 12 hours'),

('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '77777777-7777-7777-7777-777777777777', 85.00, now() - interval '5 days'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '88888888-8888-8888-8888-888888888888', 95.00, now() - interval '4 days 18 hours'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '55555555-5555-5555-5555-555555555555', 110.00, now() - interval '4 days 12 hours')
ON CONFLICT (auction_id, user_id) DO UPDATE SET bid_amount = EXCLUDED.bid_amount, created_at = EXCLUDED.created_at;

-- =============================================
-- SAMPLE NOTIFICATIONS
-- =============================================

-- Recent notifications for active auctions
INSERT INTO auction_notifications (user_id, auction_id, type, title, message, is_read, created_at) VALUES
-- Notifications for auction A
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bid_placed', 'New Bid on Your Auction', 'Emma Express placed a bid of $95.00 on "Furniture Delivery - Downtown to Suburbs"', false, now() - interval '18 hours'),
('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bid_placed', 'You''ve Been Outbid', 'A higher bid of $95.00 was placed on "Furniture Delivery - Downtown to Suburbs"', false, now() - interval '18 hours'),
('55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bid_placed', 'You''ve Been Outbid', 'A higher bid of $95.00 was placed on "Furniture Delivery - Downtown to Suburbs"', true, now() - interval '18 hours'),

-- Notifications for auction B
('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bid_placed', 'New Bid on Your Auction', 'Lisa Logistics placed a bid of $150.00 on "Electronics Shipment - Express Delivery"', false, now() - interval '8 hours'),
('66666666-6666-6666-6666-666666666666', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bid_placed', 'You''ve Been Outbid', 'A higher bid of $150.00 was placed on "Electronics Shipment - Express Delivery"', false, now() - interval '8 hours'),

-- Notifications for completed auctions
('44444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'auction_won', 'Congratulations! You Won!', 'You won the auction "Appliance Delivery - Refrigerator" with a bid of $140.00', true, now() - interval '2 hours'),
('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'auction_completed', 'Your Auction Completed', 'Your auction "Appliance Delivery - Refrigerator" was won by Alex Driver for $140.00', true, now() - interval '2 hours'),

('55555555-5555-5555-5555-555555555555', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'auction_won', 'Congratulations! You Won!', 'You won the auction "Office Relocation - Small Items" with a bid of $110.00', true, now() - interval '1 day'),
('22222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'auction_completed', 'Your Auction Completed', 'Your auction "Office Relocation - Small Items" was won by Lisa Logistics for $110.00', true, now() - interval '1 day')
ON CONFLICT DO NOTHING;

-- =============================================
-- SAMPLE AUDIT LOGS
-- =============================================

INSERT INTO auction_audit_logs (auction_id, user_id, action, old_values, new_values, created_at) VALUES
-- Auction creation logs
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'auction_created', null, '{"title": "Furniture Delivery - Downtown to Suburbs", "starting_price": 75.00}', now() - interval '2 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'auction_created', null, '{"title": "Electronics Shipment - Express Delivery", "starting_price": 120.00}', now() - interval '1 day'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'auction_created', null, '{"title": "Art Gallery Transport", "starting_price": 200.00}', now() - interval '6 hours'),

-- Bid placement logs
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'bid_placed', null, '{"bid_amount": 80.00}', now() - interval '36 hours'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'bid_placed', null, '{"bid_amount": 85.00}', now() - interval '30 hours'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 'bid_placed', null, '{"bid_amount": 95.00}', now() - interval '18 hours'),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'bid_placed', null, '{"bid_amount": 150.00}', now() - interval '8 hours'),

-- Auction completion logs
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'auction_completed', null, '{"winner_id": "44444444-4444-4444-4444-444444444444", "winning_amount": 140.00}', now() - interval '2 hours'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'auction_completed', null, '{"winner_id": "55555555-5555-5555-5555-555555555555", "winning_amount": 110.00}', now() - interval '1 day')
ON CONFLICT DO NOTHING;

-- =============================================
-- UPDATE STATISTICS
-- =============================================

-- This will be displayed when the migration runs
DO $$
DECLARE
    user_count INTEGER;
    auction_count INTEGER;
    bid_count INTEGER;
    notification_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM profiles;
    SELECT COUNT(*) INTO auction_count FROM auctions;
    SELECT COUNT(*) INTO bid_count FROM auction_bids;
    SELECT COUNT(*) INTO notification_count FROM auction_notifications;
    
    RAISE NOTICE 'Sample data inserted successfully:';
    RAISE NOTICE '- Users: %', user_count;
    RAISE NOTICE '- Auctions: %', auction_count;
    RAISE NOTICE '- Bids: %', bid_count;
    RAISE NOTICE '- Notifications: %', notification_count;
END $$;
