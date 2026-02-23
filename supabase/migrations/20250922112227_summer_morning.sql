/*
  # Create inventory management table

  1. New Tables
    - `inventory_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `name` (text)
      - `category` (text)
      - `current_stock` (integer)
      - `unit` (text)
      - `low_stock_threshold` (integer)
      - `storage_location` (text)
      - `auto_add_to_shopping` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `inventory_items` table
    - Add policies for authenticated users to manage their own items
*/

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  current_stock integer DEFAULT 0,
  unit text NOT NULL,
  low_stock_threshold integer DEFAULT 0,
  storage_location text DEFAULT '',
  auto_add_to_shopping boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own inventory items"
  ON inventory_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);