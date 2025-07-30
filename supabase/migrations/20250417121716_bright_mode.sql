/*
  # Add role field to profiles table

  1. Changes
    - Add role column to profiles table
    - Add check constraint for valid roles
    - Update existing profiles to have default role
*/

-- Add role column to profiles table
ALTER TABLE profiles
ADD COLUMN role text CHECK (role IN ('consigner', 'driver'));

-- Update existing profiles to have a default role
UPDATE profiles
SET role = 'consigner'
WHERE role IS NULL;

-- Make role NOT NULL after setting defaults
ALTER TABLE profiles
ALTER COLUMN role SET NOT NULL;

-- Add policy to ensure users can only view appropriate auctions
CREATE POLICY "Drivers can view active auctions"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        -- Consigners can view their own auctions
        (profiles.role = 'consigner' AND auctions.created_by = auth.uid())
        OR
        -- Drivers can view all active auctions
        (profiles.role = 'driver' AND auctions.status = 'active')
      )
    )
  );

-- Add policy to ensure only consigners can create auctions
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

-- Add policy to ensure only drivers can place bids
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
  );