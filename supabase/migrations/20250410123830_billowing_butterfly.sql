/*
  # Enhanced Auction System Implementation

  1. New Tables
    - `auction_audit_logs` - For tracking all auction activity
    - `auction_notifications` - For managing user notifications
    - `auction_bid_history` - For maintaining bid history

  2. Changes
    - Add validation constraints to auction_bids
    - Add notification triggers
    - Add audit logging
    - Enhance auction closure logic
*/

-- Create audit log table
CREATE TABLE IF NOT EXISTS auction_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES auctions(id),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS auction_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  auction_id uuid REFERENCES auctions(id),
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add validation constraints to auction_bids
ALTER TABLE auction_bids
  ADD CONSTRAINT valid_bid_amount 
  CHECK (amount > 0);

-- Function to log auction activity
CREATE OR REPLACE FUNCTION log_auction_activity(
  auction_id uuid,
  user_id uuid,
  action text,
  details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO auction_audit_logs (auction_id, user_id, action, details)
  VALUES (auction_id, user_id, action, details);
END;
$$;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_auction_notification(
  user_id uuid,
  auction_id uuid,
  notification_type text,
  message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO auction_notifications (user_id, auction_id, type, message)
  VALUES (user_id, auction_id, notification_type, message);
END;
$$;

-- Function to notify outbid users
CREATE OR REPLACE FUNCTION notify_outbid_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  outbid_user_id uuid;
  auction_title text;
BEGIN
  -- Get auction title
  SELECT title INTO auction_title
  FROM auctions
  WHERE id = NEW.auction_id;

  -- Find users with higher bids
  FOR outbid_user_id IN
    SELECT DISTINCT user_id
    FROM auction_bids
    WHERE auction_id = NEW.auction_id
    AND amount > NEW.amount
    AND user_id != NEW.user_id
  LOOP
    PERFORM create_auction_notification(
      outbid_user_id,
      NEW.auction_id,
      'outbid',
      format('Your bid has been outbid on auction: %s', auction_title)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Function to notify auction ending soon
CREATE OR REPLACE FUNCTION notify_auction_ending_soon()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant_id uuid;
BEGIN
  -- Notify all participants
  FOR participant_id IN
    SELECT DISTINCT user_id
    FROM auction_bids
    WHERE auction_id = NEW.id
  LOOP
    PERFORM create_auction_notification(
      participant_id,
      NEW.id,
      'ending_soon',
      format('Auction "%s" is ending in 1 minute!', NEW.title)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Enhanced close_auction function with notifications
CREATE OR REPLACE FUNCTION close_auction(auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  winning_bid_record auction_bids%ROWTYPE;
  auction_record auctions%ROWTYPE;
  winner_username text;
BEGIN
  -- Get auction details
  SELECT * INTO auction_record
  FROM auctions
  WHERE id = auction_id;

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

  -- Get winner's username
  SELECT username INTO winner_username
  FROM profiles
  WHERE id = winning_bid_record.user_id;

  -- Update auction status
  UPDATE auctions
  SET 
    status = 'completed',
    winner_id = winning_bid_record.user_id,
    winning_bid_id = winning_bid_record.id
  WHERE id = auction_id;

  -- Mark winning bid
  UPDATE auction_bids
  SET is_winning_bid = true
  WHERE id = winning_bid_record.id;

  -- Reset other bids
  UPDATE auction_bids
  SET is_winning_bid = false
  WHERE auction_id = auction_id
  AND id != winning_bid_record.id;

  -- Notify winner
  PERFORM create_auction_notification(
    winning_bid_record.user_id,
    auction_id,
    'winner',
    format('Congratulations! You won the auction "%s" with a bid of ₹%s', 
           auction_record.title, 
           winning_bid_record.amount)
  );

  -- Notify other participants
  INSERT INTO auction_notifications (user_id, auction_id, type, message)
  SELECT DISTINCT
    user_id,
    auction_id,
    'auction_ended',
    format('Auction "%s" has ended. Winner: %s', auction_record.title, winner_username)
  FROM auction_bids
  WHERE auction_id = auction_id
  AND user_id != winning_bid_record.user_id;

  -- Log auction completion
  PERFORM log_auction_activity(
    auction_id,
    winning_bid_record.user_id,
    'auction_completed',
    jsonb_build_object(
      'winner_id', winning_bid_record.user_id,
      'winning_bid', winning_bid_record.amount,
      'total_bids', (SELECT COUNT(*) FROM auction_bids WHERE auction_id = auction_id)
    )
  );
END;
$$;

-- Create triggers
CREATE TRIGGER on_new_bid
  AFTER INSERT ON auction_bids
  FOR EACH ROW
  EXECUTE FUNCTION notify_outbid_users();

CREATE TRIGGER on_auction_ending_soon
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  WHEN (
    OLD.status = 'active' AND
    NEW.status = 'active' AND
    NEW.end_time - INTERVAL '1 minute' <= NOW()
  )
  EXECUTE FUNCTION notify_auction_ending_soon();

-- Enable RLS on new tables
ALTER TABLE auction_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit logs
CREATE POLICY "Admins can view all audit logs"
  ON auction_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auctions
      WHERE auctions.id = auction_id
      AND (auctions.created_by = auth.uid() OR auctions.winner_id = auth.uid())
    )
  );

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON auction_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON auction_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());