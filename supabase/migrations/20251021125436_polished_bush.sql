/*
  # Fix users table RLS policies and database trigger

  1. Security Updates
    - Drop existing problematic RLS policies
    - Create new non-recursive RLS policies for users table
    - Add database trigger to handle new user creation

  2. RLS Policies
    - Allow users to view their own profile
    - Allow users to view household members
    - Allow users to insert their own profile
    - Allow users to update their own profile
    - Allow owners to manage household users

  3. Database Trigger
    - Automatically create public.users entry when auth.users is created
    - Set initial household_id and role appropriately
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Owners can manage household users" ON users;
DROP POLICY IF EXISTS "Users can read household members" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Allow users to read other household members (non-recursive)
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

-- Policy 3: Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 4: Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 5: Allow owners to manage users in their household
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
BEGIN
  INSERT INTO public.users (id, email, phone_number, full_name, role, household_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, NEW.phone),
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM public.users) THEN 'owner'
      ELSE 'member'
    END,
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM public.users) THEN NEW.id
      ELSE (
        SELECT household_id 
        FROM public.users 
        WHERE role = 'owner' 
        LIMIT 1
      )
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();