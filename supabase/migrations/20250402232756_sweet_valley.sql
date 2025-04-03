/*
  # Create reports table for storing inspection reports

  1. New Tables
    - `reports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `inspection_type` (text)
      - `facility_name` (text)
      - `equipment_id` (text)
      - `inspection_date` (date)
      - `inspector_name` (text)
      - `findings` (text)
      - `recommendations` (text)
      - `generated_report` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `reports` table
    - Add policies for authenticated users to:
      - Create their own reports
      - Read their own reports
*/

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  inspection_type text NOT NULL,
  facility_name text NOT NULL,
  equipment_id text NOT NULL,
  inspection_date date NOT NULL,
  inspector_name text NOT NULL,
  findings text NOT NULL,
  recommendations text NOT NULL,
  generated_report text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);