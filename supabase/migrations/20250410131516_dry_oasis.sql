/*
  # Add update_auction_status function

  1. Changes
    - Add function to update auction status
    - Function takes auction_id parameter
    - Updates single auction status based on end time
*/

-- Create function to update auction status
CREATE OR REPLACE FUNCTION update_auction_status(auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update status for expired auction
  UPDATE auctions
  SET status = 'completed'
  WHERE id = auction_id
  AND status = 'active'
  AND end_time <= NOW();

  -- If the auction is completed, ensure winner is determined
  IF EXISTS (
    SELECT 1
    FROM auctions
    WHERE id = auction_id
    AND status = 'completed'
    AND winner_id IS NULL
  ) THEN
    PERFORM close_auction(auction_id);
  END IF;
END;
$$;