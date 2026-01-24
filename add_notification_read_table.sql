-- Migration: Add NotificationRead table for per-admin notification tracking
-- Run this migration after updating Prisma schema

-- Create notification_reads table
CREATE TABLE IF NOT EXISTS "notification_reads" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_reads_admin_id_notification_type_reference_id_key" 
ON "notification_reads"("admin_id", "notification_type", "reference_id");

-- Create indexes
CREATE INDEX IF NOT EXISTS "notification_reads_admin_id_notification_type_idx" 
ON "notification_reads"("admin_id", "notification_type");

CREATE INDEX IF NOT EXISTS "notification_reads_reference_id_idx" 
ON "notification_reads"("reference_id");

CREATE INDEX IF NOT EXISTS "notification_reads_admin_id_read_at_idx" 
ON "notification_reads"("admin_id", "read_at");

-- Add foreign key constraint
ALTER TABLE "notification_reads" 
ADD CONSTRAINT "notification_reads_admin_id_fkey" 
FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
