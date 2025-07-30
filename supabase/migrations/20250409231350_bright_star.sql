/*
  # Add foreign key relationship between auctions and profiles

  1. Changes
    - Add foreign key constraint from auctions.winner_id to profiles.id
    - This enables proper joins between auctions and profiles tables
    - Allows fetching winner profile data in auction queries

  2. Security
    - No changes to RLS policies required
    - Existing table permissions remain unchanged
*/

DO $$ BEGIN
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'auctions_winner_id_profiles_fkey'
  ) THEN
    ALTER TABLE auctions
    ADD CONSTRAINT auctions_winner_id_profiles_fkey
    FOREIGN KEY (winner_id) REFERENCES profiles(id);
  END IF;
END $$;