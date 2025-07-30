/*
  # Add Cancel Bid Feature for Drivers

  1. New Functions
    - `cancel_bid` - Function to cancel a driver's bid on an active auction
    - Proper validation and notification handling

  2. Security
    - Only drivers can cancel their own bids
    - Only bids on active auctions can be cancelled
    - Proper audit logging
*/

-- Create function to cancel a bid
CREATE OR REPLACE FUNCTION cancel_bid(bid_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bid_record RECORD;
    auction_record RECORD;
BEGIN
    -- Get bid details with proper qualification
    SELECT ab.id, ab.auction_id, ab.user_id, ab.amount, ab.is_winning_bid
    INTO bid_record
    FROM auction_bids ab
    WHERE ab.id = bid_id_param;
    
    -- Check if bid exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bid not found';
    END IF;
    
    -- Check if user owns the bid
    IF bid_record.user_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only cancel your own bids';
    END IF;
    
    -- Get auction details
    SELECT a.id, a.status, a.title, a.end_time, a.created_by
    INTO auction_record
    FROM auctions a
    WHERE a.id = bid_record.auction_id;
    
    -- Check if auction is still active
    IF auction_record.status != 'active' THEN
        RAISE EXCEPTION 'You can only cancel bids on active auctions';
    END IF;
    
    -- Check if auction hasn't expired
    IF auction_record.end_time <= NOW() THEN
        RAISE EXCEPTION 'You cannot cancel bids on expired auctions';
    END IF;
    
    -- Check if this is a winning bid (shouldn't happen for active auctions, but safety check)
    IF bid_record.is_winning_bid THEN
        RAISE EXCEPTION 'Cannot cancel a winning bid';
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cancel_bid(uuid) TO authenticated;