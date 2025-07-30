/*
  # Fix update_auction_status function

  1. Changes
    - Remove window function from HAVING clause
    - Restructure the query to use a subquery for determining the winning bid
    - Ensure proper handling of auction status updates
  
  2. Function Updates
    - Modify update_auction_status to use proper SQL syntax
    - Fix the logic for determining winning bids
*/

CREATE OR REPLACE FUNCTION update_auction_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update completed auctions and set winners
  WITH winning_bids AS (
    SELECT DISTINCT ON (auction_id)
      auction_id,
      id as bid_id,
      user_id as winner_id,
      amount as winning_amount
    FROM auction_bids
    WHERE auction_id IN (
      SELECT id 
      FROM auctions 
      WHERE status = 'active' AND end_time <= NOW()
    )
    ORDER BY auction_id, amount DESC, created_at ASC
  )
  UPDATE auctions
  SET 
    status = 'completed',
    winner_id = wb.winner_id,
    winning_bid_id = wb.bid_id
  FROM winning_bids wb
  WHERE auctions.id = wb.auction_id
    AND auctions.status = 'active'
    AND auctions.end_time <= NOW();

  -- Handle auctions with no bids
  UPDATE auctions
  SET status = 'completed'
  WHERE status = 'active'
    AND end_time <= NOW()
    AND id NOT IN (SELECT DISTINCT auction_id FROM auction_bids);
END;
$$;