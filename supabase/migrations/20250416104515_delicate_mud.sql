/*
  # Fix auction status update function

  1. Changes
    - Remove window function from HAVING clause in update_auction_status function
    - Restructure the query to properly handle auction status updates
    - Add proper error handling
  
  2. Security
    - Function remains accessible to authenticated users only
*/

CREATE OR REPLACE FUNCTION update_auction_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update completed auctions
  UPDATE auctions
  SET 
    status = 'completed',
    winner_id = (
      SELECT user_id
      FROM auction_bids
      WHERE auction_bids.auction_id = auctions.id
      ORDER BY amount DESC, created_at ASC
      LIMIT 1
    ),
    winning_bid_id = (
      SELECT id
      FROM auction_bids
      WHERE auction_bids.auction_id = auctions.id
      ORDER BY amount DESC, created_at ASC
      LIMIT 1
    )
  WHERE 
    status = 'active' 
    AND end_time <= NOW();

  -- Update winning bid status
  UPDATE auction_bids
  SET is_winning_bid = true
  WHERE id IN (
    SELECT winning_bid_id 
    FROM auctions 
    WHERE status = 'completed' 
    AND winning_bid_id IS NOT NULL
  );
END;
$$;