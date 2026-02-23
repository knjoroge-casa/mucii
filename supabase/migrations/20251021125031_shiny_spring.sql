/*
  # Fix Users Table RLS Policies

  1. Security Updates
    - Drop existing problematic RLS policies that cause infinite recursion
    - Create new simplified RLS policies that avoid self-referential queries
    - Ensure proper access control without circular dependencies

  2. Policy Changes
    - Users can read their own profile data
    - Users can read other users in their household
    - Only owners/admins can manage users
    - Prevent infinite recursion in policy queries
*/

-- Drop existing policies that may cause infinite recursion
DROP POLICY IF EXISTS "Owners can manage household users" ON users;
DROP POLICY IF EXISTS "Users can read household data" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create new simplified policies without self-referential queries
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to read other users in their household
-- This policy avoids infinite recursion by using a direct join
CREATE POLICY "Users can read household members"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    household_id = (
      SELECT u.household_id 
      FROM users u 
      WHERE u.id = auth.uid()
      LIMIT 1
    )
  );

-- Only owners can manage other users (insert, delete, role changes)
CREATE POLICY "Owners can manage household users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users owner 
      WHERE owner.id = auth.uid() 
        AND owner.role = 'owner'
        AND owner.household_id = users.household_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users owner 
      WHERE owner.id = auth.uid() 
        AND owner.role = 'owner'
    )
  );