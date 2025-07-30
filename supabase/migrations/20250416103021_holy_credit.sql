/*
  # Fix auction winner selection logic
  
  1. Changes
    - Update close_auction function to properly handle single bid cases
    - Fix winner determination logic
    - Ensure proper winner notification
    - Add better error handling
*/

-- Function to close auction and determine winner
CREATE OR REPLACE FUNCTION close_auction(auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  winning_bid_record auction_bids%ROWTYPE;
  auction_record auctions%ROWTYPE;
BEGIN
  -- Get auction details first
  SELECT * INTO auction_record
  FROM auctions
  WHERE id = auction_id;

  -- Only proceed if auction is active or just completed
  IF auction_record.status IN ('active', 'completed') THEN
    -- Find the winning bid (lowest bid)
    SELECT *
    INTO winning_bid_record
    FROM auction_bids
    WHERE auction_id = close_auction.auction_id
    AND amount > 0
    ORDER BY amount ASC, created_at ASC
    LIMIT 1;

    -- Update auction status and winner
    UPDATE auctions
    SET 
      status = 'completed',
      winner_id = COALESCE(winning_bid_record.user_id, NULL),
      winning_bid_id = COALESCE(winning_bid_record.id, NULL)
    WHERE id = close_auction.auction_id;

    -- Reset all bids first
    UPDATE auction_bids ab
    SET is_winning_bid = false
    WHERE ab.auction_id = close_auction.auction_id;

    -- If we have a winning bid, mark it
    IF winning_bid_record.id IS NOT NULL THEN
      UPDATE auction_bids ab
      SET is_winning_bid = true
      WHERE ab.id = winning_bid_record.id;

      -- Notify winner
      INSERT INTO auction_notifications (
        user_id,
        auction_id,
        type,
        message
      )
      VALUES (
        winning_bid_record.user_id,
        auction_id,
        'winner',
        format('Congratulations! You won the auction "%s" with a bid of ₹%s', 
               auction_record.title, 
               winning_bid_record.amount)
      );

      -- Notify other participants
      INSERT INTO auction_notifications (
        user_id,
        auction_id,
        type,
        message
      )
      SELECT 
        ab.user_id,
        auction_id,
        'auction_ended',
        format('Auction "%s" has ended. The winning bid was ₹%s', 
               auction_record.title,
               winning_bid_record.amount)
      FROM auction_bids ab
      WHERE ab.auction_id = auction_id
      AND ab.user_id != winning_bid_record.user_id;

    ELSE
      -- No valid winning bid found
      INSERT INTO auction_notifications (
        user_id,
        auction_id,
        type,
        message
      )
      SELECT DISTINCT
        user_id,
        auction_id,
        'auction_ended',
        format('Auction "%s" has ended without a winner', auction_record.title)
      FROM auction_bids
      WHERE auction_id = auction_id;
    END IF;

    -- Log auction completion
    INSERT INTO auction_audit_logs (
      auction_id,
      user_id,
      action,
      details
    )
    VALUES (
      auction_id,
      COALESCE(winning_bid_record.user_id, NULL),
      'auction_completed',
      jsonb_build_object(
        'winner_id', winning_bid_record.user_id,
        'winning_bid', winning_bid_record.amount,
        'total_bids', (SELECT COUNT(*) FROM auction_bids WHERE auction_id = auction_id)
      )
    );
  END IF;
END;
$$;