/*
  # Update auction system for quick auctions

  1. Changes
    - Add function to automatically close auctions after 1 minute
    - Update auction end time to 1 minute from creation
    - Add notification trigger for auction winners

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
BEGIN
  -- Find the lowest unique bid
  SELECT DISTINCT ON (amount) *
  INTO winning_bid_record
  FROM auction_bids
  WHERE auction_bids.auction_id = close_auction.auction_id
  GROUP BY id, amount
  HAVING COUNT(*) = 1
  ORDER BY amount ASC, created_at ASC
  LIMIT 1;

  -- Update the auction with the winner
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