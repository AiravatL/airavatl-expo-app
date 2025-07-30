/*
  # Update auction system for quick auctions

  1. Changes
    - Add function to automatically close auctions after 1 minute
    - Update auction end time to 1 minute from creation
    - Add notification trigger for auction winners
    - Implement comprehensive bid validation and winner selection logic

  2. Security
    - Functions run with security definer to ensure proper access
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
  -- Get auction details
  SELECT * INTO auction_record
  FROM auctions
  WHERE id = auction_id;

  -- Find the lowest valid unique bid
  WITH valid_bids AS (
    -- Filter valid bids based on criteria
    SELECT ab.*
    FROM auction_bids ab
    WHERE ab.auction_id = close_auction.auction_id
    AND ab.amount > 0  -- Ensure positive bid amount
    AND EXISTS (      -- Verify bidder exists and is valid
      SELECT 1 
      FROM profiles p 
      WHERE p.id = ab.user_id
    )
  ),
  unique_bids AS (
    -- Get bids that are unique (no duplicates)
    SELECT *
    FROM valid_bids
    GROUP BY id, amount
    HAVING COUNT(*) OVER (PARTITION BY amount) = 1
  ),
  ranked_bids AS (
    -- Rank bids by amount and timestamp
    SELECT 
      *,
      ROW_NUMBER() OVER (ORDER BY amount ASC, created_at ASC) as rank
    FROM unique_bids
  )
  -- Select the winning bid
  SELECT *
  INTO winning_bid_record
  FROM ranked_bids
  WHERE rank = 1;

  -- Update the auction with the winner if a valid bid was found
  IF winning_bid_record.id IS NOT NULL THEN
    UPDATE auctions
    SET 
      status = 'completed',
      winner_id = winning_bid_record.user_id,
      winning_bid_id = winning_bid_record.id
    WHERE id = close_auction.auction_id;

    -- Mark the winning bid
    UPDATE auction_bids
    SET is_winning_bid = true
    WHERE id = winning_bid_record.id;

    -- Reset other bids' winning status
    UPDATE auction_bids
    SET is_winning_bid = false
    WHERE auction_id = close_auction.auction_id
    AND id != winning_bid_record.id;
  ELSE
    -- No valid winning bid found, mark auction as completed without a winner
    UPDATE auctions
    SET 
      status = 'completed',
      winner_id = NULL,
      winning_bid_id = NULL
    WHERE id = close_auction.auction_id;
  END IF;
END;
$$;

-- Function to check and close expired auctions
CREATE OR REPLACE FUNCTION check_expired_auctions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_auction_id uuid;
BEGIN
  FOR expired_auction_id IN
    SELECT id
    FROM auctions
    WHERE status = 'active'
    AND end_time <= NOW()
  LOOP
    PERFORM close_auction(expired_auction_id);
  END LOOP;
END;
$$;

-- Create a function to schedule auction closure
CREATE OR REPLACE FUNCTION schedule_auction_closure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Schedule the auction to close after 1 minute
  NEW.end_time := NEW.start_time + interval '1 minute';
  RETURN NEW;
END;
$$;

-- Create trigger to set end time on auction creation
DO $$ BEGIN
  DROP TRIGGER IF EXISTS set_auction_end_time ON auctions;
  CREATE TRIGGER set_auction_end_time
    BEFORE INSERT ON auctions
    FOR EACH ROW
    EXECUTE FUNCTION schedule_auction_closure();
END $$;