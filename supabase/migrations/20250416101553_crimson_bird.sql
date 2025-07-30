/*
  # Add profile details fields

  1. Changes
    - Add phone_number field to profiles table
    - Add upi_id field to profiles table
    - Add address field to profiles table
    - Add bio field to profiles table
    - Add avatar_url field for future profile picture support

  2. Security
    - Maintain existing RLS policies
    - Add validation for phone numbers
*/

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN phone_number text,
ADD COLUMN upi_id text,
ADD COLUMN address text,
ADD COLUMN bio text,
ADD COLUMN avatar_url text;

-- Add phone number format validation
ALTER TABLE profiles
ADD CONSTRAINT valid_phone_number
CHECK (
  phone_number IS NULL OR  -- Allow null values
  phone_number ~ '^[0-9]{10}$'  -- Exactly 10 digits
);

-- Add UPI ID format validation
ALTER TABLE profiles
ADD CONSTRAINT valid_upi_id
CHECK (
  upi_id IS NULL OR  -- Allow null values
  upi_id ~ '^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$'  -- Basic UPI format validation
);