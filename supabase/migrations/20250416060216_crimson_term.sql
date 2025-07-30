/*
  # Fix auction status update function

  1. Changes
    - Create proper RPC function for updating auction status
    - Ensure function is accessible via REST API
    - Add proper security definer and permissions
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_auction_status(uuid);

-- Create new function with proper RPC exposure
CREATE OR REPLACE FUNCTION update_auction_status(auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_auction_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_auction_status(uuid) TO anon;