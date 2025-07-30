-- Drop existing problematic triggers and functions
DROP TRIGGER IF EXISTS auto_close_expired_auction ON auctions;
DROP TRIGGER IF EXISTS ensure_auction_closed_trigger ON auctions;
DROP TRIGGER IF EXISTS check_auction_expiry_on_update ON auctions;
DROP FUNCTION IF EXISTS auto_close_auction();
DROP FUNCTION IF EXISTS ensure_auction_closed();
DROP FUNCTION IF EXISTS trigger_check_auction_expiry();

-- Drop the existing close_auction function completely to avoid parameter name conflicts
DROP FUNCTION IF EXISTS close_auction(uuid);

-- Create improved close_auction function with new parameter name
CREATE OR REPLACE FUNCTION close_auction(input_auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  winning_bid_record auction_bids%ROWTYPE;
  auction_record auctions%ROWTYPE;
  winner_username text;
  consigner_id uuid;
BEGIN
  -- Get auction details first
  SELECT * INTO auction_record
  FROM auctions a
  WHERE a.id = input_auction_id;

  -- Only proceed if auction exists and is active
  IF auction_record.id IS NULL OR auction_record.status != 'active' THEN
    RETURN;
  END IF;

  -- Get consigner ID
  consigner_id := auction_record.created_by;

  -- Find the winning bid (lowest amount, earliest timestamp for ties)
  SELECT *
  INTO winning_bid_record
  FROM auction_bids ab
  WHERE ab.auction_id = input_auction_id
  AND ab.amount > 0
  ORDER BY ab.amount ASC, ab.created_at ASC
  LIMIT 1;

  -- Get winner's username if there is a winner
  IF winning_bid_record.id IS NOT NULL THEN
    SELECT p.username INTO winner_username
    FROM profiles p
    WHERE p.id = winning_bid_record.user_id;
  END IF;

  -- Update auction status and winner
  UPDATE auctions a
  SET 
    status = 'completed',
    winner_id = COALESCE(winning_bid_record.user_id, NULL),
    winning_bid_id = COALESCE(winning_bid_record.id, NULL)
  WHERE a.id = input_auction_id;

  -- Reset all bids first
  UPDATE auction_bids ab
  SET is_winning_bid = false
  WHERE ab.auction_id = input_auction_id;

  -- If we have a winning bid, mark it and send notifications
  IF winning_bid_record.id IS NOT NULL THEN
    -- Mark the winning bid
    UPDATE auction_bids ab
    SET is_winning_bid = true
    WHERE ab.id = winning_bid_record.id;

    -- Notify winner
    INSERT INTO auction_notifications (
      user_id,
      auction_id,
      type,
      message
    )
    VALUES (
      winning_bid_record.user_id,
      input_auction_id,
      'winner',
      format('Congratulations! You won the auction "%s" with a bid of ₹%s', 
             auction_record.title, 
             winning_bid_record.amount)
    );

    -- Notify consigner about the winner
    INSERT INTO auction_notifications (
      user_id,
      auction_id,
      type,
      message
    )
    VALUES (
      consigner_id,
      input_auction_id,
      'auction_completed',
      format('Your auction "%s" has ended. Winner: %s with bid ₹%s', 
             auction_record.title,
             COALESCE(winner_username, 'Unknown'),
             winning_bid_record.amount)
    );

    -- Notify other bidders
    INSERT INTO auction_notifications (
      user_id,
      auction_id,
      type,
      message
    )
    SELECT 
      ab.user_id,
      input_auction_id,
      'auction_ended',
      format('Auction "%s" has ended. The winning bid was ₹%s', 
             auction_record.title,
             winning_bid_record.amount)
    FROM auction_bids ab
    WHERE ab.auction_id = input_auction_id
    AND ab.user_id != winning_bid_record.user_id
    AND ab.user_id != consigner_id;

  ELSE
    -- No winner - notify consigner
    INSERT INTO auction_notifications (
      user_id,
      auction_id,
      type,
      message
    )
    VALUES (
      consigner_id,
      input_auction_id,
      'auction_completed',
      format('Your auction "%s" has ended with no winner', 
             auction_record.title)
    );

    -- Notify all bidders about no winner
    INSERT INTO auction_notifications (
      user_id,
      auction_id,
      type,
      message
    )
    SELECT DISTINCT
      ab.user_id,
      input_auction_id,
      'auction_ended',
      format('Auction "%s" has ended with no winner', auction_record.title)
    FROM auction_bids ab
    WHERE ab.auction_id = input_auction_id
    AND ab.user_id != consigner_id;
  END IF;

  -- Log auction completion
  INSERT INTO auction_audit_logs (
    auction_id,
    user_id,
    action,
    details
  )
  VALUES (
    input_auction_id,
    COALESCE(winning_bid_record.user_id, NULL),
    'auction_completed',
    jsonb_build_object(
      'winner_id', winning_bid_record.user_id,
      'winning_bid', winning_bid_record.amount,
      'total_bids', (SELECT COUNT(*) FROM auction_bids ab WHERE ab.auction_id = input_auction_id)
    )
  );
END;
$$;

-- Create function to check and close all expired auctions
CREATE OR REPLACE FUNCTION check_and_close_expired_auctions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_auction RECORD;
BEGIN
  -- Find all expired active auctions
  FOR expired_auction IN
    SELECT a.id, a.title, a.end_time
    FROM auctions a
    WHERE a.status = 'active'
    AND a.end_time <= NOW()
  LOOP
    -- Close each expired auction
    PERFORM close_auction(expired_auction.id);
    
    -- Log the closure
    RAISE NOTICE 'Closed expired auction: % (ID: %, End time: %)', 
      expired_auction.title, 
      expired_auction.id, 
      expired_auction.end_time;
  END LOOP;
END;
$$;

-- Create trigger function to auto-close auctions on any update
CREATE OR REPLACE FUNCTION trigger_check_auction_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this auction is active but expired, close it
  IF NEW.status = 'active' AND NEW.end_time <= NOW() THEN
    PERFORM close_auction(NEW.id);
    -- Reload the auction to get updated status
    SELECT * INTO NEW FROM auctions a WHERE a.id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to check auction expiry on updates
CREATE TRIGGER check_auction_expiry_on_update
  AFTER UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_auction_expiry();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION close_auction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_close_expired_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_close_expired_auctions() TO anon;

-- Close any currently expired auctions
SELECT check_and_close_expired_auctions();