/*
  # Fix Auction RLS Policies

  1. Changes
    - Remove recursive policy conditions for auctions table
    - Simplify driver view policy to avoid circular dependencies
    - Update policy logic to be more efficient

  2. Security
    - Maintain security while avoiding recursion
    - Ensure proper access control for drivers and consigners
*/

-- Drop existing policies
DROP POLICY IF EXISTS "consigner_view_own_auctions" ON auctions;
DROP POLICY IF EXISTS "driver_view_active_auctions" ON auctions;

-- Create new, simplified policies
CREATE POLICY "consigner_view_own_auctions" ON auctions
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

-- Simplified driver policy that avoids recursion
CREATE POLICY "driver_view_auctions" ON auctions
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