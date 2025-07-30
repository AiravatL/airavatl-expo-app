/*
  # Fix Auction RLS Policy

  1. Changes
    - Remove and replace the existing auction_select_policy with a simplified version
    - Split the policy into separate policies for drivers and consigners
    - Remove potential recursive queries

  2. Security
    - Maintain existing access control rules but implement them more efficiently
    - Keep RLS enabled on auctions table
*/

-- Drop the existing policy that's causing recursion
DROP POLICY IF EXISTS "auction_select_policy" ON "auctions";

-- Create separate policies for consigners and drivers
CREATE POLICY "consigner_auction_select_policy" ON "auctions"
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'consigner'
    AND auctions.created_by = auth.uid()
  )
);

CREATE POLICY "driver_auction_select_policy" ON "auctions"
FOR SELECT TO authenticated
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