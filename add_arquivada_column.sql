-- SQL script to add the 'arquivada' column to the Class table
-- Run this in your PostgreSQL database

-- Step 1: Add the column with default value false
ALTER TABLE "Class" 
ADD COLUMN IF NOT EXISTS "arquivada" BOOLEAN DEFAULT false;

-- Step 2: Update existing rows that might have NULL to false
-- (This handles the case where DEFAULT wasn't applied to existing rows)
UPDATE "Class" 
SET "arquivada" = false 
WHERE "arquivada" IS NULL;

-- Step 3: Make the column NOT NULL (optional, but recommended)
-- Uncomment the line below if you want to enforce NOT NULL constraint
-- ALTER TABLE "Class" ALTER COLUMN "arquivada" SET NOT NULL;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS "Class_arquivada_idx" ON "Class"("arquivada");

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Class' AND column_name = 'arquivada';
