/*
  # Enhance auctions with date and cancellation support

  1. Changes
    - Add consignment_date to auctions table
    - Add cancellation support
    - Add function to handle auction cancellation
    - Add function to reassign winner on cancellation
*/

-- Add consignment_date to auctions table
ALTER TABLE auctions
ADD COLUMN consignment_date timestamptz NOT NULL DEFAULT now();

-- Add cancelled status to status check
ALTER TABLE auctions
DROP CONSTRAINT IF EXISTS auctions_status_check;

ALTER TABLE auctions
ADD CONSTRAINT auctions_status_check
CHECK (status IN ('active', 'completed', 'cancelled'));

-- Function to handle auction cancellation by winner
CREATE OR REPLACE FUNCTION handle_winner_cancellation(auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_winning_bid_record auction_bids%ROWTYPE;
BEGIN
  -- Find the next lowest unique bid
  SELECT *
  INTO next_winning_bid_record
  FROM auction_bids
  WHERE auction_id = handle_winner_cancellation.auction_id
  AND amount > 0
  AND NOT is_winning_bid
  ORDER BY amount ASC, created_at ASC
  LIMIT 1;

  -- Update auction with new winner
  IF next_winning_bid_record.id IS NOT NULL THEN
    UPDATE auctions
    SET 
      winner_id = next_winning_bid_record.user_id,
      winning_bid_id = next_winning_bid_record.id
    WHERE id = auction_id;

    -- Update bid statuses
    UPDATE auction_bids
    SET is_winning_bid = false
    WHERE auction_id = auction_id;

    UPDATE auction_bids
    SET is_winning_bid = true
    WHERE id = next_winning_bid_record.id;

    -- Notify new winner
    INSERT INTO auction_notifications (
      user_id,
      auction_id,
      type,
      message
    )
    VALUES (
      next_winning_bid_record.user_id,
      auction_id,
      'new_winner',
      'You are now the winner of this auction due to previous winner cancellation'
    );
  ELSE
    -- No other valid bids, mark auction as cancelled
    UPDATE auctions
    SET 
      status = 'cancelled',
      winner_id = NULL,
      winning_bid_id = NULL
    WHERE id = auction_id;
  END IF;
END;
$$;

-- Function to handle auction cancellation by consigner
CREATE OR REPLACE FUNCTION handle_consigner_cancellation(auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark auction as cancelled
  UPDATE auctions
  SET 
    status = 'cancelled',
    winner_id = NULL,
    winning_bid_id = NULL
  WHERE id = auction_id;

  -- Notify all bidders
  INSERT INTO auction_notifications (
    user_id,
    auction_id,
    type,
    message
  )
  SELECT DISTINCT
    user_id,
    auction_id,
    'auction_cancelled',
    'This auction has been cancelled by the consigner'
  FROM auction_bids
  WHERE auction_id = auction_id;
END;
$$;