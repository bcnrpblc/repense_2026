-- Add priority list fields to Student table
ALTER TABLE "students" 
ADD COLUMN IF NOT EXISTS "priority_list" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "priority_list_course_id" TEXT,
ADD COLUMN IF NOT EXISTS "priority_list_added_at" TIMESTAMP;

-- Add index for priority_list field for faster queries
CREATE INDEX IF NOT EXISTS "students_priority_list_idx" ON "students"("priority_list");
