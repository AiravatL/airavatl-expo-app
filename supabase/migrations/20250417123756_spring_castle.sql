/*
  # Strengthen auction policies

  1. Changes
    - Drop and recreate auction policies with stricter checks
    - Add validation trigger for auction creation
    - Ensure only consigners can create auctions

  2. Security
    - Maintain existing RLS on other tables
    - Add additional validation at the database level
*/

-- Drop existing auction policies
DROP POLICY IF EXISTS "auction_select_policy" ON auctions;
DROP POLICY IF EXISTS "auction_insert_policy" ON auctions;

-- Create stricter auction policies
CREATE POLICY "auction_select_policy"
  ON auctions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        -- Consigners can only see their own auctions
        (profiles.role = 'consigner' AND auctions.created_by = auth.uid())
        OR
        -- Drivers can only see active auctions
        (profiles.role = 'driver' AND auctions.status = 'active')
      )
    )
  );

CREATE POLICY "auction_insert_policy"
  ON auctions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'consigner'
    )
    AND auth.uid() = created_by
  );

-- Create function to validate auction creation
CREATE OR REPLACE FUNCTION validate_auction_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure creator is a consigner
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'consigner'
  ) THEN
    RAISE EXCEPTION 'Only consigners can create auctions';
  END IF;

  -- Set created_by to current user
  NEW.created_by := auth.uid();

  RETURN NEW;
END;
$$;

-- Create trigger for auction validation
DROP TRIGGER IF EXISTS validate_auction_creation_trigger ON auctions;
CREATE TRIGGER validate_auction_creation_trigger
  BEFORE INSERT ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION validate_auction_creation();