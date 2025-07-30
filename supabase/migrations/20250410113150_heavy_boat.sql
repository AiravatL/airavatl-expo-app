/*
  # Add foreign key relationship between auction_bids and profiles

  1. Changes
    - Add foreign key constraint from auction_bids.user_id to profiles.id
    - Handle existing data by creating profiles for users if needed
    - This enables proper joining between auction_bids and profiles tables
    - Allows querying bid information with associated profile usernames

  2. Security
    - No changes to RLS policies required
    - Existing policies continue to protect data access
*/

-- First, ensure all users in auction_bids have corresponding profiles
DO $$ 
BEGIN
  INSERT INTO profiles (id, username)
  SELECT DISTINCT ab.user_id, CONCAT('user_', SUBSTRING(ab.user_id::text, 1, 8))
  FROM auction_bids ab
  LEFT JOIN profiles p ON p.id = ab.user_id
  WHERE p.id IS NULL;
END $$;

-- Now add the foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'auction_bids_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE auction_bids
    ADD CONSTRAINT auction_bids_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id);
  END IF;
END $$;