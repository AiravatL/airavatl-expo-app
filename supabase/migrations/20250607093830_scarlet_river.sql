/*
  # Fix auction visibility for drivers

  1. Changes
    - Drop existing restrictive policies
    - Create new policies that allow drivers to see all active auctions
    - Maintain security while ensuring proper visibility

  2. Security
    - Drivers can see all active auctions
    - Consigners can see their own auctions
    - Maintain existing insert policies
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "consigner_view_own_auctions" ON auctions;
DROP POLICY IF EXISTS "driver_view_auctions" ON auctions;
DROP POLICY IF EXISTS "consigner_create_auctions" ON auctions;

-- Create new policies with proper visibility
CREATE POLICY "consigner_view_own_auctions"
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

CREATE POLICY "driver_view_auctions"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
      AND (
        auctions.status = 'active'
        OR auctions.winner_id = auth.uid()
      )
    )
  );

CREATE POLICY "consigner_create_auctions"
  ON auctions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'consigner'
    )
    AND auth.uid() = created_by
  );