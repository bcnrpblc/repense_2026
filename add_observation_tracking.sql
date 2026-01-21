-- Add observation tracking columns to Attendance table
ALTER TABLE "Attendance" 
ADD COLUMN IF NOT EXISTS "lida_por_admin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Attendance" 
ADD COLUMN IF NOT EXISTS "lida_em" TIMESTAMP(3);

-- Create index for faster queries on unread observations
CREATE INDEX IF NOT EXISTS "Attendance_lida_por_admin_idx" ON "Attendance"("lida_por_admin");
