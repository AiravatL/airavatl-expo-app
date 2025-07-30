/*
  # Fix role-based authentication

  1. Changes
    - Drop existing policies
    - Create new policies with proper role checks
    - Add trigger for profile creation
    - Add role validation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Drivers can view active auctions" ON auctions;
DROP POLICY IF EXISTS "Only consigners can create auctions" ON auctions;
DROP POLICY IF EXISTS "Only drivers can place bids" ON auction_bids;

-- Ensure role column exists and has proper constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN role text;
  END IF;
END $$;

-- Add role check constraint if it doesn't exist
DO $$ BEGIN
  ALTER TABLE profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;
  
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('consigner', 'driver'));
END $$;

-- Make role NOT NULL
ALTER TABLE profiles
ALTER COLUMN role SET NOT NULL;

-- Create new policies with proper role checks
CREATE POLICY "Drivers can view active auctions"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        (profiles.role = 'consigner' AND auctions.created_by = auth.uid())
        OR
        (profiles.role = 'driver' AND auctions.status = 'active')
      )
    )
  );

CREATE POLICY "Only consigners can create auctions"
  ON auctions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'consigner'
    )
  );

CREATE POLICY "Only drivers can place bids"
  ON auction_bids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'driver'
    )
  );

-- Create function to validate user role
CREATE OR REPLACE FUNCTION validate_user_role()
RETURNS trigger AS $$
BEGIN
  IF NEW.role NOT IN ('consigner', 'driver') THEN
    RAISE EXCEPTION 'Invalid role. Must be either "consigner" or "driver"';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role validation
DROP TRIGGER IF EXISTS validate_role_trigger ON profiles;
CREATE TRIGGER validate_role_trigger
  BEFORE INSERT OR UPDATE OF role
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_role();