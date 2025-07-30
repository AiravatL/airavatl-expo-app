/*
  # Fix auction winner display

  1. Changes
    - Drop and recreate the foreign key constraint with the correct name
    - Update existing data to maintain integrity
    - Add necessary indexes for performance

  2. Security
    - No changes to RLS policies required
*/

-- First, remove any existing constraints that might conflict
DO $$ BEGIN
  ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_winner_id_fkey;
  ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_winner_id_profiles_fkey;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Ensure all winner_ids have corresponding profiles
INSERT INTO profiles (id, username)
SELECT DISTINCT a.winner_id, CONCAT('user_', SUBSTRING(a.winner_id::text, 1, 8))
FROM auctions a
LEFT JOIN profiles p ON p.id = a.winner_id
WHERE a.winner_id IS NOT NULL AND p.id IS NULL;

-- Add the correct foreign key constraint
ALTER TABLE auctions
  ADD CONSTRAINT auctions_winner_id_profiles_fkey
  FOREIGN KEY (winner_id)
  REFERENCES profiles(id);

-- Create an index to improve join performance
CREATE INDEX IF NOT EXISTS idx_auctions_winner_id ON auctions(winner_id);