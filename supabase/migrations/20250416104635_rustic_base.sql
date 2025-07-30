/*
  # Fix update_auction_status function

  1. Changes
    - Remove window functions from HAVING clause
    - Simplify winner determination logic
    - Add proper error handling
*/

CREATE OR REPLACE FUNCTION update_auction_status(input_auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auction_record auctions%ROWTYPE;
  winning_bid_record auction_bids%ROWTYPE;
BEGIN
  -- Get auction details
  SELECT * INTO auction_record
  FROM auctions
  WHERE id = input_auction_id;

  -- Only proceed if auction exists and is active
  IF FOUND AND auction_record.status = 'active' AND auction_record.end_time <= NOW() THEN
    -- Find the winning bid (lowest amount, earliest timestamp)
    SELECT *
    INTO winning_bid_record
    FROM auction_bids
    WHERE auction_id = input_auction_id
    AND amount > 0
    ORDER BY amount ASC, created_at ASC
    LIMIT 1;

    -- Update auction status
    UPDATE auctions
    SET 
      status = 'completed',
      winner_id = COALESCE(winning_bid_record.user_id, NULL),
      winning_bid_id = COALESCE(winning_bid_record.id, NULL)
    WHERE id = input_auction_id;

    -- If we have a winning bid, update bid statuses
    IF winning_bid_record.id IS NOT NULL THEN
      -- Mark winning bid
      UPDATE auction_bids
      SET is_winning_bid = true
      WHERE id = winning_bid_record.id;

      -- Reset other bids
      UPDATE auction_bids
      SET is_winning_bid = false
      WHERE auction_id = input_auction_id
      AND id != winning_bid_record.id;
    END IF;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_auction_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_auction_status(uuid) TO anon;