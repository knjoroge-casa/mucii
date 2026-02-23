/*
  # Create shopping list table

  1. New Tables
    - `shopping_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `name` (text)
      - `category` (text)
      - `quantity` (text)
      - `unit` (text)
      - `preferred_brand` (text)
      - `preferred_store` (text)
      - `from_inventory` (boolean)
      - `inventory_id` (uuid, nullable)
      - `completed` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `shopping_items` table
    - Add policies for authenticated users to manage their own items
*/

-- Create shopping_items table
CREATE TABLE IF NOT EXISTS shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  quantity text DEFAULT '1',
  unit text NOT NULL,
  preferred_brand text DEFAULT '',
  preferred_store text DEFAULT '',
  from_inventory boolean DEFAULT false,
  inventory_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own shopping items"
  ON shopping_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);