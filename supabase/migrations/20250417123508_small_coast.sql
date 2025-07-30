/*
  # Final fix for role-based access control

  1. Changes
    - Drop all existing policies
    - Create new, simpler policies with proper role checks
    - Fix profile creation and role validation
    - Ensure proper access control for auctions and bids
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Consigners can view their own auctions" ON auctions;
DROP POLICY IF EXISTS "Drivers can view active auctions" ON auctions;
DROP POLICY IF EXISTS "Only consigners can create auctions" ON auctions;
DROP POLICY IF EXISTS "Consigners can view bids on their auctions" ON auction_bids;
DROP POLICY IF EXISTS "Drivers can view their own bids" ON auction_bids;
DROP POLICY IF EXISTS "Only drivers can place bids" ON auction_bids;

-- Ensure role column is properly configured
ALTER TABLE profiles
ALTER COLUMN role SET NOT NULL;

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('consigner', 'driver'));

-- Create simplified auction policies
CREATE POLICY "auction_select_policy"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        -- Consigners can only see their own auctions
        (profiles.role = 'consigner' AND auctions.created_by = auth.uid())
        OR
        -- Drivers can only see active auctions
        (profiles.role = 'driver' AND auctions.status = 'active')
      )
    )
  );

CREATE POLICY "auction_insert_policy"
  ON auctions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'consigner'
      AND auth.uid() = auctions.created_by
    )
  );

-- Create simplified bid policies
CREATE POLICY "bid_select_policy"
  ON auction_bids
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        -- Drivers can see their own bids
        (profiles.role = 'driver' AND auction_bids.user_id = auth.uid())
        OR
        -- Consigners can see bids on their auctions
        (profiles.role = 'consigner' AND EXISTS (
          SELECT 1 FROM auctions
          WHERE auctions.id = auction_bids.auction_id
          AND auctions.created_by = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "bid_insert_policy"
  ON auction_bids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
    )
    AND
    EXISTS (
      SELECT 1 FROM auctions
      WHERE auctions.id = auction_bids.auction_id
      AND auctions.status = 'active'
    )
    AND auth.uid() = auction_bids.user_id
  );

-- Create function to validate auction bid
CREATE OR REPLACE FUNCTION validate_auction_bid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure bid amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Bid amount must be positive';
  END IF;

  -- Ensure bidder is a driver
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'driver'
  ) THEN
    RAISE EXCEPTION 'Only drivers can place bids';
  END IF;

  -- Set user_id to current user
  NEW.user_id := auth.uid();

  RETURN NEW;
END;
$$;

-- Create trigger for bid validation
DROP TRIGGER IF EXISTS validate_auction_bid_trigger ON auction_bids;
CREATE TRIGGER validate_auction_bid_trigger
  BEFORE INSERT ON auction_bids
  FOR EACH ROW
  EXECUTE FUNCTION validate_auction_bid();