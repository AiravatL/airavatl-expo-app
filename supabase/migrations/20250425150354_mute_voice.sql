/*
  # Add auction winner notifications

  1. Changes
    - Update close_auction function to send notifications
    - Add notifications for auction winners and consigners
    - Improve notification messages with auction details

  2. Security
    - Maintain existing RLS policies
    - Keep existing security definer settings
*/

-- Update close_auction function to include notifications
CREATE OR REPLACE FUNCTION close_auction(auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  winning_bid_record auction_bids%ROWTYPE;
  auction_record auctions%ROWTYPE;
  winner_username text;
  consigner_id uuid;
BEGIN
  -- Get auction details first
  SELECT * INTO auction_record
  FROM auctions
  WHERE id = auction_id;

  -- Get consigner ID
  consigner_id := auction_record.created_by;

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

    -- Get winner's username if there is a winner
    IF winning_bid_record.id IS NOT NULL THEN
      SELECT username INTO winner_username
      FROM profiles
      WHERE id = winning_bid_record.user_id;
    END IF;

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

    -- If we have a winning bid, mark it and send notifications
    IF winning_bid_record.id IS NOT NULL THEN
      -- Mark the winning bid
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

      -- Notify consigner about the winner
      INSERT INTO auction_notifications (
        user_id,
        auction_id,
        type,
        message
      )
      VALUES (
        consigner_id,
        auction_id,
        'auction_completed',
        format('Your auction "%s" has ended. Winner: %s with bid ₹%s', 
               auction_record.title,
               winner_username,
               winning_bid_record.amount)
      );

      -- Notify other bidders
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
      AND ab.user_id != winning_bid_record.user_id
      AND ab.user_id != consigner_id;

    ELSE
      -- No winner - notify consigner
      INSERT INTO auction_notifications (
        user_id,
        auction_id,
        type,
        message
      )
      VALUES (
        consigner_id,
        auction_id,
        'auction_completed',
        format('Your auction "%s" has ended with no winner', 
               auction_record.title)
      );

      -- Notify all bidders about no winner
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
        format('Auction "%s" has ended with no winner', auction_record.title)
      FROM auction_bids
      WHERE auction_id = auction_id
      AND user_id != consigner_id;
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