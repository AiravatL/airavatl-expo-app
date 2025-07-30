/*
  # Fix custom auction duration

  1. Changes
    - Update schedule_auction_closure function to use custom duration
    - Add validation for minimum and maximum duration
    - Improve error handling for invalid durations

  2. Security
    - Maintain existing security definer settings
    - Keep existing RLS policies
*/

-- Drop existing function and trigger
DROP FUNCTION IF EXISTS schedule_auction_closure() CASCADE;
DROP TRIGGER IF EXISTS set_auction_end_time ON auctions;

-- Create function to schedule auction closure with custom duration
CREATE OR REPLACE FUNCTION schedule_auction_closure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  duration_minutes interval;
BEGIN
  -- Calculate duration between start_time and end_time
  duration_minutes := NEW.end_time - NEW.start_time;
  
  -- Validate duration (minimum 5 minutes, maximum 24 hours)
  IF duration_minutes < interval '5 minutes' THEN
    RAISE EXCEPTION 'Auction duration must be at least 5 minutes';
  END IF;
  
  IF duration_minutes > interval '24 hours' THEN
    RAISE EXCEPTION 'Auction duration cannot exceed 24 hours';
  END IF;

  -- Keep the custom end_time as provided
  RETURN NEW;
END;
$$;

-- Create trigger to validate auction duration on creation
CREATE TRIGGER set_auction_end_time
  BEFORE INSERT ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION schedule_auction_closure();

-- Function to validate auction creation
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

  -- Validate start time
  IF NEW.start_time < NOW() THEN
    NEW.start_time := NOW();
  END IF;

  -- Validate end time is after start time
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'End time must be after start time';
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