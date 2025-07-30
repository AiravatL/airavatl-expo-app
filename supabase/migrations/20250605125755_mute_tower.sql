/*
  # Fix Auction RLS Policies

  1. Changes
    - Remove existing RLS policies for auctions table that cause recursion
    - Create new simplified policies that avoid circular dependencies
    - Maintain security while allowing proper access to auctions

  2. Security
    - Enable RLS on auctions table
    - Add policies for:
      - Consigners can view and manage their own auctions
      - Drivers can view active auctions and auctions they've bid on
      - Drivers can view auctions they've won
*/

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "consigner_auction_select_policy" ON auctions;
DROP POLICY IF EXISTS "driver_auction_select_policy" ON auctions;
DROP POLICY IF EXISTS "auction_insert_policy" ON auctions;

-- Create new simplified policies

-- Policy for consigners to view their own auctions
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

-- Policy for drivers to view active auctions
CREATE POLICY "driver_view_active_auctions"
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
      OR EXISTS (
        SELECT 1 FROM auction_bids
        WHERE auction_bids.auction_id = auctions.id
        AND auction_bids.user_id = auth.uid()
      )
    )
  )
);

-- Policy for consigners to create auctions
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