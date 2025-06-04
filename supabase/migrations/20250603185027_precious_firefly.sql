/*
  # Initial Database Setup

  1. Users Table
    - `id` (uuid, primary key) - matches Firebase Auth UID
    - `email` (text, unique)
    - `name` (text)
    - `role` (text) - either 'admin' or 'employee'
    - `created_at` (timestamp)

  2. Security
    - Enable RLS on users table
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'employee')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Insert initial admin user
INSERT INTO users (id, email, name, role)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'admin@example.com', 'Admin User', 'admin')
ON CONFLICT (id) DO NOTHING;