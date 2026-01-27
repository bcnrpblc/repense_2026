-- ============================================================================
-- Migration: Add Admin Role and Audit Logs Table
-- ============================================================================
-- This migration adds:
-- 1. role column to admins table
-- 2. audit_logs table with indexes
-- 3. Foreign key relationship
-- 4. Promotes Flavio to superadmin
-- ============================================================================

-- Step 1: Add role column to admins table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admins' AND column_name = 'role'
    ) THEN
        ALTER TABLE "admins" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'admin';
        RAISE NOTICE 'Added role column to admins table';
    ELSE
        RAISE NOTICE 'Role column already exists in admins table';
    END IF;
END $$;

-- Step 2: Create audit_logs table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_type" TEXT,
    "target_entity" TEXT,
    "target_id" TEXT,
    "action" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS "audit_logs_event_type_criado_em_idx" 
    ON "audit_logs"("event_type", "criado_em");

CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_criado_em_idx" 
    ON "audit_logs"("actor_id", "criado_em");

CREATE INDEX IF NOT EXISTS "audit_logs_target_entity_target_id_idx" 
    ON "audit_logs"("target_entity", "target_id");

CREATE INDEX IF NOT EXISTS "audit_logs_criado_em_idx" 
    ON "audit_logs"("criado_em");

-- Step 4: Add foreign key constraint (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'audit_logs_actor_id_fkey'
    ) THEN
        ALTER TABLE "audit_logs" 
        ADD CONSTRAINT "audit_logs_actor_id_fkey" 
        FOREIGN KEY ("actor_id") 
        REFERENCES "admins"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for actor_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Step 5: Promote Flavio to superadmin
UPDATE "admins" 
SET "role" = 'superadmin' 
WHERE "email" = 'flavioangeleu@gmail.com';

-- Step 6: Verify promotion (should return 1 row)
DO $$
DECLARE
    promoted_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO promoted_count
    FROM "admins" 
    WHERE "email" = 'flavioangeleu@gmail.com' AND "role" = 'superadmin';
    
    IF promoted_count = 1 THEN
        RAISE NOTICE 'Successfully promoted Flavio to superadmin';
    ELSE
        RAISE WARNING 'Flavio promotion check failed. Count: %', promoted_count;
    END IF;
END $$;

-- Verification queries (run these separately to verify)
-- SELECT id, email, role FROM "admins" WHERE "email" = 'flavioangeleu@gmail.com';
-- SELECT COUNT(*) FROM "audit_logs";
-- SELECT * FROM "audit_logs" ORDER BY "criado_em" DESC LIMIT 5;
