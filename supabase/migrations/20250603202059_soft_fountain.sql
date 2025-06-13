/*
  # Season Settings Table

  1. New Tables
    - `season_settings`
      - `id` (uuid, primary key)
      - `year` (integer)
      - `start_week` (integer)
      - `end_week` (integer)
      - `default_frequency` (integer)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on season_settings table
    - Add policies for authenticated users
*/

-- Create season_settings table
CREATE TABLE IF NOT EXISTS season_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  start_week integer NOT NULL,
  end_week integer NOT NULL,
  default_frequency integer NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE season_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read season settings"
  ON season_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update season settings"
  ON season_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Insert default settings for current year
INSERT INTO season_settings (year, start_week, end_week, default_frequency)
VALUES 
  (EXTRACT(YEAR FROM CURRENT_DATE), 18, 42, 2)
ON CONFLICT (id) DO NOTHING;