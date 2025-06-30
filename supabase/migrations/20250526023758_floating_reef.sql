/*
  # Add user ownership to task recordings

  1. Changes
    - Add user_id column to task_recordings table
    - Update existing policies to enforce user ownership
    - Add new policies for update and delete operations

  2. Security
    - Modify existing policies to check user ownership
    - Add new policies for user-specific operations
*/

-- Add user_id column
ALTER TABLE task_recordings 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

-- Drop existing policies to update them
DROP POLICY IF EXISTS "Anyone can read task recordings" ON task_recordings;
DROP POLICY IF EXISTS "Authenticated users can insert recordings" ON task_recordings;

-- Recreate policies with user ownership checks
CREATE POLICY "Anyone can read task recordings"
  ON task_recordings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own recordings"
  ON task_recordings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
  ON task_recordings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
  ON task_recordings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);