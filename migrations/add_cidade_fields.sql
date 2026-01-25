-- ============================================================================
-- Migration: Add cidade fields to Class and Student tables
-- ============================================================================
-- This migration adds city support to the registration system
-- Phase 1: Add Fields (Non-Breaking)
-- ============================================================================

-- Add cidade column to Class table (nullable initially)
ALTER TABLE "Class" 
ADD COLUMN IF NOT EXISTS "cidade" VARCHAR(255);

-- Add cidade_preferencia column to Student table (nullable)
ALTER TABLE "students" 
ADD COLUMN IF NOT EXISTS "cidade_preferencia" VARCHAR(255);

-- Add index on cidade for query performance
CREATE INDEX IF NOT EXISTS "Class_cidade_idx" ON "Class"("cidade");

-- ============================================================================
-- Phase 2: Data Migration
-- ============================================================================

-- Populate cidade from eh_itu
UPDATE "Class" 
SET "cidade" = CASE 
  WHEN "eh_itu" = true THEN 'Itu'
  WHEN "eh_itu" = false THEN 'Indaiatuba'
  ELSE 'Indaiatuba'  -- Default for any NULL eh_itu
END
WHERE "cidade" IS NULL;

-- Verify migration (run separately to check)
-- SELECT COUNT(*) FROM "Class" WHERE "cidade" IS NULL;  -- Should be 0
-- SELECT "eh_itu", "cidade", COUNT(*) FROM "Class" GROUP BY "eh_itu", "cidade";

-- ============================================================================
-- Phase 3: Make cidade Required (After Verification)
-- ============================================================================
-- Run these AFTER verifying all records have cidade populated

-- Set default for future records
ALTER TABLE "Class" 
ALTER COLUMN "cidade" SET DEFAULT 'Indaiatuba';

-- Make cidade NOT NULL (after verifying all records have cidade)
-- NOTE: Uncomment and run after verifying all records have cidade populated
-- ALTER TABLE "Class" 
-- ALTER COLUMN "cidade" SET NOT NULL;

-- ============================================================================
-- Phase 4: Cleanup - Remove eh_itu (Future, After Full Migration)
-- ============================================================================
-- Only run this after all application code uses cidade instead of eh_itu

-- Remove eh_itu column (only after all code uses cidade)
-- NOTE: Uncomment and run after all application code has been migrated
-- ALTER TABLE "Class" DROP COLUMN "eh_itu";

-- ============================================================================
-- Rollback Queries (if needed)
-- ============================================================================

-- Remove cidade column
-- ALTER TABLE "Class" DROP COLUMN IF EXISTS "cidade";
-- DROP INDEX IF EXISTS "Class_cidade_idx";

-- Remove cidade_preferencia column
-- ALTER TABLE "students" DROP COLUMN IF EXISTS "cidade_preferencia";
