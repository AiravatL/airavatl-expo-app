/*
  # Fix auction status updates and winner determination

  1. Changes
    - Fix loop variable declaration in check_expired_auctions function
    - Enhance close_auction function with better winner determination
    - Add proper error handling for edge cases
    - Improve auction status management

  2. Security
    - Maintain security definer on functions
    - Keep existing RLS policies
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

  -- Only proceed if auction is active
  IF auction_record.status = 'active' THEN
    -- Find the lowest unique bid
    WITH valid_bids AS (
      SELECT ab.*
      FROM auction_bids ab
      WHERE ab.auction_id = close_auction.auction_id
      AND ab.amount > 0
    ),
    unique_bids AS (
      SELECT *
      FROM valid_bids
      GROUP BY id, amount
      HAVING COUNT(*) OVER (PARTITION BY amount) = 1
    )
    SELECT *
    INTO winning_bid_record
    FROM unique_bids
    ORDER BY amount ASC, created_at ASC
    LIMIT 1;

    -- Update auction status and winner
    UPDATE auctions
    SET 
      status = 'completed',
      winner_id = COALESCE(winning_bid_record.user_id, NULL),
      winning_bid_id = COALESCE(winning_bid_record.id, NULL)
    WHERE id = auction_id;

    -- If we have a winning bid, mark it
    IF winning_bid_record.id IS NOT NULL THEN
      -- Mark the winning bid
      UPDATE auction_bids
      SET is_winning_bid = true
      WHERE id = winning_bid_record.id;

      -- Reset other bids
      UPDATE auction_bids
      SET is_winning_bid = false
      WHERE auction_id = auction_id
      AND id != winning_bid_record.id;
    END IF;
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
  expired_auction RECORD;
BEGIN
  -- Find and process expired auctions
  FOR expired_auction IN
    SELECT id
    FROM auctions
    WHERE status = 'active'
    AND end_time <= NOW()
  LOOP
    PERFORM close_auction(expired_auction.id);
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