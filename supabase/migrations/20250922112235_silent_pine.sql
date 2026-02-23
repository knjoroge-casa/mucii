/*
  # Create tasks table

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `title` (text)
      - `description` (text)
      - `zone` (text)
      - `frequency` (text array)
      - `week_days` (text array)
      - `priority` (text)
      - `assignee` (text)
      - `due_date` (date)
      - `completed` (boolean)
      - `completed_at` (timestamp)
      - `completed_by` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `tasks` table
    - Add policies for authenticated users to manage their own tasks
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  zone text NOT NULL,
  frequency text[] DEFAULT '{}',
  week_days text[] DEFAULT '{}',
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assignee text DEFAULT '',
  due_date date,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);