/*
  # Fix auction winner relationship and queries

  1. Changes
    - Ensure proper foreign key relationship between auctions and profiles
    - Add indexes for better query performance
    - Update close_auction function to handle winner updates correctly

  2. Security
    - Maintain existing RLS policies
*/

-- First, ensure we have the correct foreign key relationship
DO $$ BEGIN
  -- Remove existing constraints if they exist
  ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_winner_id_fkey;
  ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_winner_id_profiles_fkey;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add the correct foreign key constraint
ALTER TABLE auctions
  ADD CONSTRAINT auctions_winner_id_profiles_fkey
  FOREIGN KEY (winner_id)
  REFERENCES profiles(id);

-- Create an index to improve join performance
CREATE INDEX IF NOT EXISTS idx_auctions_winner_id ON auctions(winner_id);

-- Update close_auction function to handle winner updates correctly
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

-- Create or replace the auto_close_auction function
CREATE OR REPLACE FUNCTION auto_close_auction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the auction should be closed
  IF NEW.status = 'active' AND NEW.end_time <= NOW() THEN
    -- Set status to completed
    NEW.status := 'completed';
    -- Close the auction
    PERFORM close_auction(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure the auto-close trigger is in place
DROP TRIGGER IF EXISTS auto_close_expired_auction ON auctions;
CREATE TRIGGER auto_close_expired_auction
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION auto_close_auction();