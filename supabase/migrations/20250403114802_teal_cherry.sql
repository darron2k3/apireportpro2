/*
  # Update reports table schema

  1. Changes
    - Add new columns for specific inspection types
    - Update existing columns to match new requirements

  2. New Columns
    - API510 specific:
      - equipment_type
      - shell
      - heads
      - nozzles
      - supports
    - API570 specific:
      - piping_components
      - supports
      - bolting
    - API653 specific:
      - tank_type
      - tank_location
      - shell
      - bottom
      - roof
      - nozzles
    - Common fields:
      - coating
      - insulation
      - welds
*/

DO $$ BEGIN
  -- Add new columns for common fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'coating') THEN
    ALTER TABLE reports ADD COLUMN coating text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'insulation') THEN
    ALTER TABLE reports ADD COLUMN insulation text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'welds') THEN
    ALTER TABLE reports ADD COLUMN welds text;
  END IF;

  -- Add new columns for API510
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'equipment_type') THEN
    ALTER TABLE reports ADD COLUMN equipment_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'shell') THEN
    ALTER TABLE reports ADD COLUMN shell text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'heads') THEN
    ALTER TABLE reports ADD COLUMN heads text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'nozzles') THEN
    ALTER TABLE reports ADD COLUMN nozzles text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'supports') THEN
    ALTER TABLE reports ADD COLUMN supports text;
  END IF;

  -- Add new columns for API570
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'piping_components') THEN
    ALTER TABLE reports ADD COLUMN piping_components text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'bolting') THEN
    ALTER TABLE reports ADD COLUMN bolting text;
  END IF;

  -- Add new columns for API653
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'tank_type') THEN
    ALTER TABLE reports ADD COLUMN tank_type text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'tank_location') THEN
    ALTER TABLE reports ADD COLUMN tank_location text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'bottom') THEN
    ALTER TABLE reports ADD COLUMN bottom text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'roof') THEN
    ALTER TABLE reports ADD COLUMN roof text;
  END IF;
END $$;