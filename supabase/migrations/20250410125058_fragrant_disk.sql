/*
  # Fix auction status updates and winner display

  1. Changes
    - Add function to ensure auctions are properly closed
    - Add trigger to automatically update auction status
    - Improve winner relationship handling
*/

-- Function to ensure auctions are properly closed
CREATE OR REPLACE FUNCTION ensure_auction_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If the auction has ended but status is still active, close it
  IF OLD.status = 'active' AND NEW.status = 'active' AND NEW.end_time <= NOW() THEN
    NEW.status := 'completed';
    PERFORM close_auction(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to ensure auctions are closed
DROP TRIGGER IF EXISTS ensure_auction_closed_trigger ON auctions;
CREATE TRIGGER ensure_auction_closed_trigger
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_auction_closed();

-- Function to automatically update auction status
CREATE OR REPLACE FUNCTION update_auction_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update status for expired auctions
  UPDATE auctions
  SET status = 'completed'
  WHERE status = 'active'
  AND end_time <= NOW();
END;
$$;