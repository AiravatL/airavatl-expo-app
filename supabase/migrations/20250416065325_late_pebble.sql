/*
  # Add vehicle type to auctions table

  1. Changes
    - Add vehicle_type column to auctions table
    - Add check constraint for valid vehicle types
    - Update existing auctions to have default vehicle type

  2. Security
    - No changes to RLS policies required
*/

-- Add vehicle_type column to auctions table
ALTER TABLE auctions
ADD COLUMN vehicle_type text CHECK (
  vehicle_type IN (
    'three_wheeler',
    'pickup_truck',
    'mini_truck',
    'medium_truck',
    'large_truck'
  )
) DEFAULT 'pickup_truck';

-- Update existing auctions to have a default vehicle type
UPDATE auctions
SET vehicle_type = 'pickup_truck'
WHERE vehicle_type IS NULL;

-- Make vehicle_type NOT NULL after setting defaults
ALTER TABLE auctions
ALTER COLUMN vehicle_type SET NOT NULL;