-- ============================================================================
-- Rollback Script: Remove Admin Role and Audit Logs Table
-- ============================================================================
-- WARNING: This will delete all audit logs! Use with caution.
-- ============================================================================

-- Step 1: Drop foreign key constraint
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_actor_id_fkey";

-- Step 2: Drop indexes
DROP INDEX IF EXISTS "audit_logs_event_type_criado_em_idx";
DROP INDEX IF EXISTS "audit_logs_actor_id_criado_em_idx";
DROP INDEX IF EXISTS "audit_logs_target_entity_target_id_idx";
DROP INDEX IF EXISTS "audit_logs_criado_em_idx";

-- Step 3: Drop audit_logs table
DROP TABLE IF EXISTS "audit_logs";

-- Step 4: Revert Flavio's role (optional - comment out if you want to keep superadmin)
UPDATE "admins" 
SET "role" = 'admin' 
WHERE "email" = 'flavioangeleu@gmail.com';

-- Step 5: Remove role column (optional - comment out if you want to keep the column)
-- ALTER TABLE "admins" DROP COLUMN IF EXISTS "role";
