-- Migration script to add geolocation fields to timesheets table
-- Run this script to add geolocation support to existing database
-- For PostgreSQL

-- Add geolocation columns for clock-in
ALTER TABLE timesheets 
ADD COLUMN IF NOT EXISTS "geoLat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "geoLon" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "geoAccuracy" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "locationDenied" BOOLEAN DEFAULT false;

-- Add geolocation columns for clock-out
ALTER TABLE timesheets 
ADD COLUMN IF NOT EXISTS "clockOutGeoLat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "clockOutGeoLon" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "clockOutGeoAccuracy" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "clockOutLocationDenied" BOOLEAN DEFAULT false;

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'timesheets' 
AND (column_name LIKE '%geo%' OR column_name LIKE '%location%')
ORDER BY column_name;

