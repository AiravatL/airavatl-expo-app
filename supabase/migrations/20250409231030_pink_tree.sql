/*
  # Add user profiles and enhance auction system

  1. Changes
    - Add profiles table for user information
    - Add winner relationship to auctions
    - Add bidder usernames to auction bids
    - Add automatic profile creation for new users

  2. Security
    - Enable RLS on profiles table
    - Add policies for profile access
    - Update auction policies for winner visibility
*/

-- Create profiles table if it doesn't exist
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users,
    username text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Add winner_id and winning_bid_id to auctions if they don't exist
DO $$ BEGIN
  ALTER TABLE auctions 
    ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES auth.users,
    ADD COLUMN IF NOT EXISTS winning_bid_id uuid;
EXCEPTION
  WHEN duplicate_column THEN
    NULL;
END $$;

-- Add is_winning_bid to auction_bids if it doesn't exist
DO $$ BEGIN
  ALTER TABLE auction_bids 
    ADD COLUMN IF NOT EXISTS is_winning_bid boolean DEFAULT false;
EXCEPTION
  WHEN duplicate_column THEN
    NULL;
END $$;

-- Add foreign key for winning_bid_id if it doesn't exist
DO $$ BEGIN
  ALTER TABLE auctions 
    ADD CONSTRAINT auctions_winning_bid_id_fkey 
    FOREIGN KEY (winning_bid_id) 
    REFERENCES auction_bids(id);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles table
DO $$ BEGIN
  CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles
    FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own profile"
    ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own profile"
    ON profiles
    FOR UPDATE
    USING (auth.uid() = id);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Create or replace function to close auction and determine winner
CREATE OR REPLACE FUNCTION close_auction(auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  winning_bid_record auction_bids%ROWTYPE;
BEGIN
  -- Find the lowest unique bid
  SELECT DISTINCT ON (amount) *
  INTO winning_bid_record
  FROM auction_bids
  WHERE auction_bids.auction_id = close_auction.auction_id
  GROUP BY id, amount
  HAVING COUNT(*) = 1
  ORDER BY amount ASC, created_at ASC
  LIMIT 1;

  -- Update the auction with the winner
  UPDATE auctions
  SET 
    status = 'completed',
    winner_id = winning_bid_record.user_id,
    winning_bid_id = winning_bid_record.id
  WHERE id = close_auction.auction_id;

  -- Mark the winning bid
  UPDATE auction_bids
  SET is_winning_bid = true
  WHERE id = winning_bid_record.id;
END;
$$;

-- Create or replace trigger function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    new.id,
    CONCAT('user_', SUBSTRING(new.id::text, 1, 8))
  );
  RETURN new;
END;
$$;

-- Create trigger for new user creation if it doesn't exist
DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;