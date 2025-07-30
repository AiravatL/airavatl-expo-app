/*
  # Fix user signup and profile creation

  1. Changes
    - Update handle_new_user trigger function to not create profiles automatically
    - Remove automatic profile creation on auth.users insert
    - Let the application handle profile creation explicitly
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Remove the NOT NULL constraint temporarily to allow manual profile creation
ALTER TABLE profiles
ALTER COLUMN role DROP NOT NULL;

-- Update existing profiles that might not have a role
UPDATE profiles
SET role = 'consigner'
WHERE role IS NULL;

-- Add back the NOT NULL constraint
ALTER TABLE profiles
ALTER COLUMN role SET NOT NULL;

-- Update RLS policies to be more permissive during profile creation
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);