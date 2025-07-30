/*
  # Create logistics requests and bids tables

  1. New Tables
    - `logistics_requests`
      - `id` (uuid, primary key)
      - `pickup` (text)
      - `dropoff` (text)
      - `package_details` (text)
      - `base_price` (integer)
      - `created_at` (timestamp)
      - `user_id` (uuid, references auth.users)
      - `status` (text)
      - `logistics_type` (text)
    
    - `bids`
      - `id` (uuid, primary key)
      - `request_id` (uuid, references logistics_requests)
      - `user_id` (uuid, references auth.users)
      - `amount` (integer)
      - `created_at` (timestamp)
      - `status` (text)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

CREATE TABLE logistics_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup text NOT NULL,
  dropoff text NOT NULL,
  package_details text NOT NULL,
  base_price integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'completed')),
  logistics_type text DEFAULT 'standard' CHECK (logistics_type IN ('express', 'standard'))
);

CREATE TABLE bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES logistics_requests NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'))
);

ALTER TABLE logistics_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open logistics requests"
  ON logistics_requests
  FOR SELECT
  USING (status = 'open');

CREATE POLICY "Users can create logistics requests"
  ON logistics_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bids"
  ON bids
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bids"
  ON bids
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);