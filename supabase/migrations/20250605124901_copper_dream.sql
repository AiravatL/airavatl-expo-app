/*
  # Fix auction visibility policies

  1. Changes
    - Update auction select policy to properly show active auctions
    - Fix role-based visibility rules
    - Ensure proper access for both consigners and drivers
*/

-- Drop existing policies
DROP POLICY IF EXISTS "auction_select_policy" ON auctions;

-- Create new auction select policy
CREATE POLICY "auction_select_policy"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        -- Consigners can see their own auctions
        (profiles.role = 'consigner' AND auctions.created_by = auth.uid())
        OR
        -- Drivers can see all active auctions
        (profiles.role = 'driver' AND (auctions.status = 'active' OR auctions.winner_id = auth.uid()))
      )
    )
  );