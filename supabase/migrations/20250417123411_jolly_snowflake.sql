/*
  # Implement strict role-based access control

  1. Changes
    - Drop existing policies
    - Create new, stricter policies for auctions and bids
    - Ensure proper role-based access for viewing and creating
    - Fix consigner/driver permissions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active auctions" ON auctions;
DROP POLICY IF EXISTS "Users can create auctions" ON auctions;
DROP POLICY IF EXISTS "Users can view their own completed auctions" ON auctions;
DROP POLICY IF EXISTS "Drivers can view active auctions" ON auctions;
DROP POLICY IF EXISTS "Only consigners can create auctions" ON auctions;

DROP POLICY IF EXISTS "Anyone can view bids for active auctions" ON auction_bids;
DROP POLICY IF EXISTS "Users can create bids" ON auction_bids;
DROP POLICY IF EXISTS "Users can view their own bids" ON auction_bids;
DROP POLICY IF EXISTS "Only drivers can place bids" ON auction_bids;

-- Create new auction policies
CREATE POLICY "Consigners can view their own auctions"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'consigner'
      AND auctions.created_by = auth.uid()
    )
  );

CREATE POLICY "Drivers can view active auctions"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
      AND auctions.status = 'active'
    )
  );

CREATE POLICY "Only consigners can create auctions"
  ON auctions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'consigner'
    )
  );

-- Create new bid policies
CREATE POLICY "Consigners can view bids on their auctions"
  ON auction_bids
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN auctions a ON a.created_by = p.id
      WHERE p.id = auth.uid()
      AND p.role = 'consigner'
      AND a.id = auction_bids.auction_id
    )
  );

CREATE POLICY "Drivers can view their own bids"
  ON auction_bids
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
      AND auction_bids.user_id = auth.uid()
    )
  );

CREATE POLICY "Only drivers can place bids"
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
  );

-- Create function to validate auction bid based on role
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

  -- Ensure bidder is a driver
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'driver'
  ) THEN
    RAISE EXCEPTION 'Only drivers can place bids';
  END IF;

  -- Set user_id if not provided
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;