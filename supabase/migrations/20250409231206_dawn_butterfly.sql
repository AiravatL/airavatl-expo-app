/*
  # Add foreign key for auction winner

  1. Changes
    - Add foreign key constraint between auctions.winner_id and profiles.id
    - This enables proper joining between auctions and winner profiles

  2. Security
    - No changes to RLS policies needed
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'auctions_winner_id_fkey'
  ) THEN
    ALTER TABLE auctions
    ADD CONSTRAINT auctions_winner_id_fkey
    FOREIGN KEY (winner_id) REFERENCES profiles(id);
  END IF;
END $$;