/*
  # Fix auction bids RLS policies

  1. Changes
    - Update RLS policies for auction_bids table
    - Add proper user authentication checks
    - Ensure users can only bid on active auctions
    - Add validation for bid creation

  2. Security
    - Maintain existing RLS on other tables
    - Keep existing constraints
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create bids" ON auction_bids;
DROP POLICY IF EXISTS "Users can view bids for active auctions" ON auction_bids;
DROP POLICY IF EXISTS "Users can view their own bids" ON auction_bids;

-- Create new policies with proper checks
CREATE POLICY "Users can create bids"
  ON auction_bids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- User must be the one creating the bid
    AND auth.uid() = user_id
    -- Auction must exist and be active
    AND EXISTS (
      SELECT 1 
      FROM auctions 
      WHERE id = auction_id 
      AND status = 'active'
      AND end_time > NOW()
    )
  );

CREATE POLICY "Anyone can view bids for active auctions"
  ON auction_bids
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 
      FROM auctions 
      WHERE auctions.id = auction_id
      AND (
        status = 'active'
        OR (status = 'completed' AND end_time <= NOW())
      )
    )
  );

CREATE POLICY "Users can view their own bids"
  ON auction_bids
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
  );

-- Add validation trigger to ensure bid amount is positive
CREATE OR REPLACE FUNCTION validate_auction_bid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure bid amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Bid amount must be positive';
  END IF;

  -- Set user_id if not provided
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for bid validation
DROP TRIGGER IF EXISTS validate_auction_bid_trigger ON auction_bids;
CREATE TRIGGER validate_auction_bid_trigger
  BEFORE INSERT ON auction_bids
  FOR EACH ROW
  EXECUTE FUNCTION validate_auction_bid();