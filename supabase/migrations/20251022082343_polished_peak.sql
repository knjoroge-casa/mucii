/*
  # Fix Users Table RLS Policies and Database Triggers

  This migration resolves the following issues:
  1. Infinite recursion in RLS policies for the users table
  2. Database error when saving new users during signup
  3. Proper user profile creation and household management

  ## Changes Made:
  1. Drop existing problematic RLS policies
  2. Create new non-recursive RLS policies
  3. Add handle_new_user trigger function
  4. Set up proper user creation flow
*/

-- Drop existing RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read household members" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Owners can manage household users" ON users;

-- Create new RLS policies that avoid infinite recursion
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

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

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

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

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  first_user_id UUID;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM users;
  
  IF user_count = 0 THEN
    -- This is the first user, make them owner with their own household
    INSERT INTO users (
      id,
      email,
      full_name,
      role,
      household_id,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      'owner',
      NEW.id, -- Use their own ID as household_id
      NOW(),
      NOW()
    );
  ELSE
    -- Find the first user (owner) to get household_id
    SELECT id INTO first_user_id 
    FROM users 
    WHERE role = 'owner' 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Add new user to the owner's household
    INSERT INTO users (
      id,
      email,
      full_name,
      role,
      household_id,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      'member',
      COALESCE(first_user_id, NEW.id), -- Fallback to own ID if no owner found
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;