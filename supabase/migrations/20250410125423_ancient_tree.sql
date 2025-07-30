/*
  # Fix auction winner determination and display

  1. Changes
    - Improve winner selection logic
    - Add function to properly close auctions
    - Ensure winner relationships are correctly maintained
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
    -- Find the lowest unique bid
    WITH valid_bids AS (
      SELECT ab.*
      FROM auction_bids ab
      WHERE ab.auction_id = close_auction.auction_id
      AND ab.amount > 0
    ),
    unique_amounts AS (
      SELECT amount
      FROM valid_bids
      GROUP BY amount
      HAVING COUNT(*) = 1
      ORDER BY amount ASC
      LIMIT 1
    )
    SELECT vb.*
    INTO winning_bid_record
    FROM valid_bids vb
    JOIN unique_amounts ua ON vb.amount = ua.amount;

    -- Update auction status and winner
    UPDATE auctions
    SET 
      status = 'completed',
      winner_id = COALESCE(winning_bid_record.user_id, NULL),
      winning_bid_id = COALESCE(winning_bid_record.id, NULL)
    WHERE id = auction_id;

    -- Reset all bids first
    UPDATE auction_bids
    SET is_winning_bid = false
    WHERE auction_id = auction_id;

    -- If we have a winning bid, mark it
    IF winning_bid_record.id IS NOT NULL THEN
      UPDATE auction_bids
      SET is_winning_bid = true
      WHERE id = winning_bid_record.id;
    END IF;
  END IF;
END;
$$;

-- Function to ensure auction status is up to date
CREATE OR REPLACE FUNCTION update_auction_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_auction_id uuid;
BEGIN
  -- Find expired active auctions
  FOR expired_auction_id IN
    SELECT id
    FROM auctions
    WHERE status = 'active'
    AND end_time <= NOW()
  LOOP
    -- Close each expired auction
    PERFORM close_auction(expired_auction_id);
  END LOOP;
END;
$$;

-- Create a function to automatically close auctions when they expire
CREATE OR REPLACE FUNCTION auto_close_auction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.end_time <= NOW() THEN
    NEW.status := 'completed';
    PERFORM close_auction(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically close expired auctions
DROP TRIGGER IF EXISTS auto_close_expired_auction ON auctions;
CREATE TRIGGER auto_close_expired_auction
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION auto_close_auction();

-- Create trigger to set end time on auction creation
DROP TRIGGER IF EXISTS set_auction_end_time ON auctions;
CREATE TRIGGER set_auction_end_time
  BEFORE INSERT ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION schedule_auction_closure();

-- Ensure all existing expired auctions are properly closed
SELECT update_auction_status();