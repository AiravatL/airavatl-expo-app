-- Add auction_updated notification type
-- This allows notifications to be sent when auctions are edited/updated

-- Drop existing constraint
ALTER TABLE auction_notifications
DROP CONSTRAINT IF EXISTS auction_notifications_type_check;

-- Add new constraint with auction_updated type
ALTER TABLE auction_notifications
ADD CONSTRAINT auction_notifications_type_check CHECK (
    type IN (
        'auction_created',
        'auction_updated',
        'bid_placed',
        'outbid',
        'auction_won',
        'auction_lost',
        'auction_cancelled',
        'bid_cancelled'
    )
);