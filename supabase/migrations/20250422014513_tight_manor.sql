/*
  # Create task recordings table

  1. New Tables
    - `task_recordings`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `actions` (jsonb array)
      - `environment` (jsonb)
      - `tags` (text array)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `task_recordings` table
    - Add policy for authenticated users to read all recordings
    - Add policy for authenticated users to insert new recordings
*/

CREATE TABLE IF NOT EXISTS task_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  actions jsonb NOT NULL,
  environment jsonb NOT NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read task recordings"
  ON task_recordings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert recordings"
  ON task_recordings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);