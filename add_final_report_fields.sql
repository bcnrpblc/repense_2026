-- Add final report fields to Class table
ALTER TABLE "Class" 
ADD COLUMN IF NOT EXISTS "final_report" TEXT,
ADD COLUMN IF NOT EXISTS "final_report_em" TIMESTAMP;
