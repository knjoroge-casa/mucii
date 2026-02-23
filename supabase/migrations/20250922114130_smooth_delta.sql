/*
  # Fix Supabase signup database error

  1. New Tables
    - `public.users` table to store extended user profiles
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `email` (text)
      - `role` (text, default 'member')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `public.users` table
    - Add policies for users to view and update their own data

  3. Automation
    - Create trigger function to automatically populate public.users when new user signs up
    - Handle full_name from signup metadata
*/

-- Create the public.users table to store extended user profiles
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name text,
  email text,
  role text DEFAULT 'member'::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS) for the public.users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Define RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can view their own user data.'
  ) THEN
    CREATE POLICY "Users can view their own user data." ON public.users
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can update their own user data.'
  ) THEN
    CREATE POLICY "Users can update their own user data." ON public.users
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Create a function to handle new user creation in auth.users
-- This function will insert a corresponding entry into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a trigger that fires after a new user is inserted into auth.users
-- This trigger will call the handle_new_user function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();