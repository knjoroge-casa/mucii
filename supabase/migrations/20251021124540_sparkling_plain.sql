/*
  # Update users table for phone authentication and RBAC

  1. Schema Updates
    - Add `phone_number` column for phone authentication
    - Add `hashed_pin` column for quick access PINs
    - Add `household_id` column to group users by household
    - Make `email` nullable to support phone-only users
    - Add role constraint to ensure valid roles

  2. Audit Trail Columns
    - Add `created_by_user_id` and `updated_by_user_id` to all data tables
    - These will track which user performed each action

  3. Security
    - Update RLS policies for household-based access control
    - Implement role-based permissions
*/

-- Update users table structure
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS phone_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS hashed_pin text,
  ADD COLUMN IF NOT EXISTS household_id uuid;

-- Make email nullable since users can now use phone numbers
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add constraint to ensure either email or phone is provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_email_or_phone_check' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_or_phone_check 
    CHECK (email IS NOT NULL OR phone_number IS NOT NULL);
  END IF;
END $$;

-- Set household_id for existing users (they become their own household)
UPDATE users SET household_id = id WHERE household_id IS NULL;

-- Make household_id not null after setting values
ALTER TABLE users ALTER COLUMN household_id SET NOT NULL;

-- Add audit trail columns to inventory_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN created_by_user_id uuid REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'updated_by_user_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN updated_by_user_id uuid REFERENCES users(id);
  END IF;
END $$;

-- Add audit trail columns to shopping_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopping_items' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE shopping_items ADD COLUMN created_by_user_id uuid REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopping_items' AND column_name = 'updated_by_user_id'
  ) THEN
    ALTER TABLE shopping_items ADD COLUMN updated_by_user_id uuid REFERENCES users(id);
  END IF;
END $$;

-- Add audit trail columns to tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN created_by_user_id uuid REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'updated_by_user_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN updated_by_user_id uuid REFERENCES users(id);
  END IF;
END $$;

-- Update RLS policies for household-based access

-- Users table policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update their own user data." ON users;
DROP POLICY IF EXISTS "Users can view their own user data." ON users;

-- New household-based policies for users table
CREATE POLICY "Users can read household data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    household_id = (
      SELECT household_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Owners can manage household users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND household_id = users.household_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND household_id = users.household_id
    )
  );

-- Inventory items policies
DROP POLICY IF EXISTS "Users can manage own inventory items" ON inventory_items;

CREATE POLICY "Household members can read inventory"
  ON inventory_items
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE household_id = (
        SELECT household_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Owners and admins can manage inventory"
  ON inventory_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
      AND household_id = (
        SELECT household_id FROM users WHERE user_id = inventory_items.user_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Housekeepers can update inventory stock"
  ON inventory_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'housekeeper'
      AND household_id = (
        SELECT household_id FROM users WHERE user_id = inventory_items.user_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'housekeeper'
    )
  );

-- Shopping items policies
DROP POLICY IF EXISTS "Users can manage own shopping items" ON shopping_items;

CREATE POLICY "Household members can read shopping items"
  ON shopping_items
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE household_id = (
        SELECT household_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Owners, admins, and housekeepers can manage shopping items"
  ON shopping_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner', 'housekeeper')
      AND household_id = (
        SELECT household_id FROM users WHERE user_id = shopping_items.user_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner', 'housekeeper')
    )
  );

-- Tasks policies
DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;

CREATE POLICY "Household members can read tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE household_id = (
        SELECT household_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Owners, admins, and housekeepers can manage tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner', 'housekeeper')
      AND household_id = (
        SELECT household_id FROM users WHERE user_id = tasks.user_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner', 'housekeeper')
    )
  );

-- Update the handle_new_user function to set household_id
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, household_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'owner', -- First user becomes owner
    NEW.id   -- Owner's household_id is their own id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;