/*
  # Create auctions and auction bids tables

  1. New Tables
    - `auctions`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `status` (text)
      - `winner_id` (uuid, references auth.users)
      - `winning_bid_id` (uuid, references auction_bids)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)
    
    - `auction_bids`
      - `id` (uuid, primary key)
      - `auction_id` (uuid, references auctions)
      - `user_id` (uuid, references auth.users)
      - `amount` (numeric)
      - `created_at` (timestamptz)
      - `is_winning_bid` (boolean)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create auctions table
CREATE TABLE auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  winner_id uuid REFERENCES auth.users,
  winning_bid_id uuid,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL
);

-- Create auction_bids table
CREATE TABLE auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES auctions NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz DEFAULT now(),
  is_winning_bid boolean DEFAULT false
);

-- Add foreign key constraint for winning_bid_id after both tables exist
ALTER TABLE auctions 
  ADD CONSTRAINT auctions_winning_bid_id_fkey 
  FOREIGN KEY (winning_bid_id) 
  REFERENCES auction_bids(id);

-- Enable RLS
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

-- Policies for auctions table
CREATE POLICY "Anyone can view active auctions"
  ON auctions
  FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can create auctions"
  ON auctions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their own completed auctions"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    status = 'completed' AND 
    (created_by = auth.uid() OR winner_id = auth.uid())
  );

-- Policies for auction_bids table
CREATE POLICY "Users can view bids for active auctions"
  ON auction_bids
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auctions 
      WHERE auctions.id = auction_id 
      AND status = 'active'
    )
  );

CREATE POLICY "Users can create bids"
  ON auction_bids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM auctions 
      WHERE auctions.id = auction_id 
      AND status = 'active'
    )
  );

CREATE POLICY "Users can view their own bids"
  ON auction_bids
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to close auction and determine winner
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