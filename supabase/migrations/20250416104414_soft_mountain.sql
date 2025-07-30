/*
  # Fix auction status update function

  1. Changes
    - Remove window function from HAVING clause in update_auction_status function
    - Restructure query to use proper SQL syntax
    - Maintain existing functionality while fixing the syntax error

  2. Details
    - Function updates auction status based on end time and current time
    - Uses proper SQL syntax without window functions in HAVING clause
*/

CREATE OR REPLACE FUNCTION update_auction_status()
RETURNS void AS $$
BEGIN
  -- Update completed auctions
  UPDATE auctions
  SET status = 'completed'
  WHERE 
    status = 'active' 
    AND end_time <= NOW()
    AND id IN (
      -- Get auctions with valid bids
      SELECT DISTINCT a.id 
      FROM auctions a
      INNER JOIN auction_bids b ON b.auction_id = a.id
      WHERE a.status = 'active' AND a.end_time <= NOW()
    );

  -- Update winner_id and winning_bid_id for completed auctions
  UPDATE auctions a
  SET 
    winner_id = b.user_id,
    winning_bid_id = b.id
  FROM (
    SELECT DISTINCT ON (auction_id) 
      auction_id,
      id,
      user_id,
      amount
    FROM auction_bids
    WHERE auction_id IN (
      SELECT id FROM auctions 
      WHERE status = 'completed' 
      AND winner_id IS NULL
    )
    ORDER BY auction_id, amount DESC, created_at ASC
  ) b
  WHERE a.id = b.auction_id
  AND a.status = 'completed'
  AND a.winner_id IS NULL;

  -- Cancel auctions with no bids
  UPDATE auctions
  SET status = 'cancelled'
  WHERE 
    status = 'active'
    AND end_time <= NOW()
    AND id NOT IN (
      SELECT DISTINCT auction_id 
      FROM auction_bids
    );
END;
$$ LANGUAGE plpgsql;