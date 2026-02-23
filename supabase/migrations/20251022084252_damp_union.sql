/*
  # Create automatic user profile creation

  1. New Functions
    - `handle_new_user()` - Automatically creates a user profile when a new auth user is created
  
  2. New Triggers
    - `on_auth_user_created` - Triggers profile creation after auth user insertion
  
  3. Security
    - Function uses SECURITY DEFINER to bypass RLS when creating profiles
    - Ensures new users get proper profile records automatically
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    full_name,
    email,
    created_at,
    updated_at,
    household_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    NEW.created_at,
    NEW.created_at,
    gen_random_uuid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();