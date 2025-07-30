/*
  # Comprehensive fix for auction visibility

  1. Changes
    - Drop all existing auction policies
    - Create simplified, working policies
    - Add debugging function to check policies
    - Ensure drivers can see all active auctions

  2. Security
    - Maintain proper access control
    - Fix visibility issues for drivers
*/

-- Drop ALL existing auction policies to start fresh
DROP POLICY IF EXISTS "consigner_view_own_auctions" ON auctions;
DROP POLICY IF EXISTS "driver_view_auctions" ON auctions;
DROP POLICY IF EXISTS "driver_view_active_auctions" ON auctions;
DROP POLICY IF EXISTS "consigner_create_auctions" ON auctions;
DROP POLICY IF EXISTS "auction_select_policy" ON auctions;
DROP POLICY IF EXISTS "auction_insert_policy" ON auctions;

-- Verify RLS is enabled
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies

-- Policy 1: Consigners can view their own auctions
CREATE POLICY "consigners_own_auctions"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'consigner'
    )
  );

-- Policy 2: Drivers can view ALL active auctions (simplified)
CREATE POLICY "drivers_active_auctions"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
    )
  );

-- Policy 3: Drivers can view auctions they won
CREATE POLICY "drivers_won_auctions"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    winner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
    )
  );

-- Policy 4: Only consigners can create auctions
CREATE POLICY "consigners_create_auctions"
  ON auctions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'consigner'
    )
  );

-- Create a function to test auction visibility (for debugging)
CREATE OR REPLACE FUNCTION test_auction_visibility()
RETURNS TABLE (
  auction_id uuid,
  title text,
  status text,
  created_by uuid,
  user_role text,
  can_see boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as auction_id,
    a.title,
    a.status,
    a.created_by,
    p.role as user_role,
    CASE 
      WHEN p.role = 'driver' AND a.status = 'active' THEN true
      WHEN p.role = 'consigner' AND a.created_by = auth.uid() THEN true
      WHEN p.role = 'driver' AND a.winner_id = auth.uid() THEN true
      ELSE false
    END as can_see
  FROM auctions a
  CROSS JOIN profiles p
  WHERE p.id = auth.uid();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION test_auction_visibility() TO authenticated;