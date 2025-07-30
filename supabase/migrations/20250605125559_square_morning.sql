/*
  # Fix auction visibility for active auctions

  1. Changes
    - Update auction select policy to ensure proper visibility
    - Allow drivers to see all active auctions
    - Maintain existing permissions for consigners
*/

-- Drop existing policy
DROP POLICY IF EXISTS "auction_select_policy" ON auctions;

-- Create new auction select policy with proper visibility rules
CREATE POLICY "auction_select_policy"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        -- Consigners can see their own auctions (any status)
        (profiles.role = 'consigner' AND auctions.created_by = auth.uid())
        OR
        -- Drivers can see:
        (profiles.role = 'driver' AND (
          -- All active auctions
          auctions.status = 'active'
          OR
          -- Auctions they've won
          auctions.winner_id = auth.uid()
          OR
          -- Auctions they've bid on
          EXISTS (
            SELECT 1 FROM auction_bids
            WHERE auction_bids.auction_id = auctions.id
            AND auction_bids.user_id = auth.uid()
          )
        ))
      )
    )
  );