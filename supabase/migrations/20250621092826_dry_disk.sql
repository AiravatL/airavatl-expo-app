/*
  # Fix ambiguous column reference in cancellation functions

  1. Changes
    - Drop existing `handle_consigner_cancellation` and `handle_winner_cancellation` functions
    - Recreate them with prefixed parameter names to avoid ambiguity
    - Use `p_auction_id` instead of `auction_id` for parameters
    - Use `p_user_id` instead of `user_id` for parameters

  2. Security
    - Maintains existing function permissions and behavior
    - Only changes parameter naming to resolve SQL ambiguity
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS handle_consigner_cancellation(uuid, uuid);
DROP FUNCTION IF EXISTS handle_winner_cancellation(uuid, uuid);

-- Recreate handle_consigner_cancellation with prefixed parameters
CREATE OR REPLACE FUNCTION handle_consigner_cancellation(
  p_auction_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auction_record RECORD;
  result json;
BEGIN
  -- Get auction details
  SELECT * INTO auction_record
  FROM auctions
  WHERE id = p_auction_id AND created_by = p_user_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Auction not found or not authorized'
    );
  END IF;

  -- Update auction status to cancelled
  UPDATE auctions
  SET status = 'cancelled'
  WHERE id = p_auction_id;

  -- Create audit log
  INSERT INTO auction_audit_logs (auction_id, user_id, action, details)
  VALUES (
    p_auction_id,
    p_user_id,
    'auction_cancelled',
    json_build_object(
      'cancelled_by', 'consigner',
      'reason', 'consigner_cancellation'
    )
  );

  -- Notify all bidders about cancellation
  INSERT INTO auction_notifications (user_id, auction_id, type, message)
  SELECT DISTINCT 
    ab.user_id,
    p_auction_id,
    'auction_cancelled',
    'The auction "' || auction_record.title || '" has been cancelled by the consigner.'
  FROM auction_bids ab
  WHERE ab.auction_id = p_auction_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Auction cancelled successfully'
  );
END;
$$;

-- Recreate handle_winner_cancellation with prefixed parameters
CREATE OR REPLACE FUNCTION handle_winner_cancellation(
  p_auction_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auction_record RECORD;
  next_highest_bid RECORD;
  result json;
BEGIN
  -- Get auction details and verify winner
  SELECT * INTO auction_record
  FROM auctions
  WHERE id = p_auction_id AND winner_id = p_user_id AND status = 'completed';

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Auction not found or not authorized'
    );
  END IF;

  -- Find next highest bid
  SELECT ab.*, p.username
  INTO next_highest_bid
  FROM auction_bids ab
  JOIN profiles p ON ab.user_id = p.id
  WHERE ab.auction_id = p_auction_id 
    AND ab.user_id != p_user_id
  ORDER BY ab.amount DESC, ab.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    -- Update auction with new winner
    UPDATE auctions
    SET 
      winner_id = next_highest_bid.user_id,
      winning_bid_id = next_highest_bid.id
    WHERE id = p_auction_id;

    -- Update bid status
    UPDATE auction_bids
    SET is_winning_bid = false
    WHERE auction_id = p_auction_id;

    UPDATE auction_bids
    SET is_winning_bid = true
    WHERE id = next_highest_bid.id;

    -- Notify new winner
    INSERT INTO auction_notifications (user_id, auction_id, type, message)
    VALUES (
      next_highest_bid.user_id,
      p_auction_id,
      'auction_won',
      'Congratulations! You are now the winner of "' || auction_record.title || '" due to the previous winner''s cancellation.'
    );

    -- Notify consigner
    INSERT INTO auction_notifications (user_id, auction_id, type, message)
    VALUES (
      auction_record.created_by,
      p_auction_id,
      'winner_changed',
      'The winner of your auction "' || auction_record.title || '" has changed to ' || next_highest_bid.username || ' due to cancellation.'
    );

    result := json_build_object(
      'success', true,
      'message', 'Winner cancelled, auction reassigned to next highest bidder',
      'new_winner', next_highest_bid.username
    );
  ELSE
    -- No other bids, reopen auction
    UPDATE auctions
    SET 
      status = 'active',
      winner_id = NULL,
      winning_bid_id = NULL,
      end_time = NOW() + INTERVAL '24 hours'
    WHERE id = p_auction_id;

    -- Notify consigner
    INSERT INTO auction_notifications (user_id, auction_id, type, message)
    VALUES (
      auction_record.created_by,
      p_auction_id,
      'auction_reopened',
      'Your auction "' || auction_record.title || '" has been reopened due to winner cancellation.'
    );

    result := json_build_object(
      'success', true,
      'message', 'Winner cancelled, auction reopened for 24 hours'
    );
  END IF;

  -- Create audit log
  INSERT INTO auction_audit_logs (auction_id, user_id, action, details)
  VALUES (
    p_auction_id,
    p_user_id,
    'winner_cancelled',
    json_build_object(
      'cancelled_by', 'winner',
      'reason', 'winner_cancellation',
      'result', result
    )
  );

  RETURN result;
END;
$$;