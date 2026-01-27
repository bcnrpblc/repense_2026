-- ============================================================================
-- Step-by-Step Migration: Add Admin Role and Audit Logs Table
-- ============================================================================
-- Run each section separately if you prefer step-by-step execution
-- ============================================================================

-- ============================================================================
-- STEP 1: Add role column to admins table
-- ============================================================================
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'admin';

-- ============================================================================
-- STEP 2: Create audit_logs table
-- ============================================================================
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

-- ============================================================================
-- STEP 3: Create indexes for audit_logs
-- ============================================================================
CREATE INDEX IF NOT EXISTS "audit_logs_event_type_criado_em_idx" 
    ON "audit_logs"("event_type", "criado_em");

CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_criado_em_idx" 
    ON "audit_logs"("actor_id", "criado_em");

CREATE INDEX IF NOT EXISTS "audit_logs_target_entity_target_id_idx" 
    ON "audit_logs"("target_entity", "target_id");

CREATE INDEX IF NOT EXISTS "audit_logs_criado_em_idx" 
    ON "audit_logs"("criado_em");

-- ============================================================================
-- STEP 4: Add foreign key constraint
-- ============================================================================
ALTER TABLE "audit_logs" 
ADD CONSTRAINT "audit_logs_actor_id_fkey" 
FOREIGN KEY ("actor_id") 
REFERENCES "admins"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- ============================================================================
-- STEP 5: Promote Flavio to superadmin
-- ============================================================================
UPDATE "admins" 
SET "role" = 'superadmin' 
WHERE "email" = 'flavioangeleu@gmail.com';

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify)
-- ============================================================================
-- Check Flavio's role:
-- SELECT id, email, role FROM "admins" WHERE "email" = 'flavioangeleu@gmail.com';

-- Check audit_logs table exists:
-- SELECT COUNT(*) FROM "audit_logs";

-- Check table structure:
-- \d audit_logs
