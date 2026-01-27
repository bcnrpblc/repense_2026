# Database Migration Instructions

## Files Created

1. **`add_admin_role_and_audit_logs.sql`** - Complete migration with safety checks (recommended)
2. **`add_admin_role_and_audit_logs_step_by_step.sql`** - Step-by-step version for manual execution
3. **`rollback_admin_role_and_audit_logs.sql`** - Rollback script (use with caution)

## What This Migration Does

1. Adds `role` column to `admins` table (default: 'admin')
2. Creates `audit_logs` table with all necessary columns
3. Creates indexes for performance
4. Adds foreign key relationship between `audit_logs` and `admins`
5. Promotes Flavio (flavioangeleu@gmail.com) to superadmin

## How to Run

### Option 1: Using psql (Recommended)

```bash
# Connect to your database
psql -h <host> -U <username> -d <database_name>

# Run the migration
\i add_admin_role_and_audit_logs.sql

# Or run step-by-step version
\i add_admin_role_and_audit_logs_step_by_step.sql
```

### Option 2: Using psql from command line

```bash
psql -h <host> -U <username> -d <database_name> -f add_admin_role_and_audit_logs.sql
```

### Option 3: Using pgAdmin or DBeaver

1. Open the SQL file in your database client
2. Execute the entire script
3. Check for any errors

### Option 4: Copy-paste into database console

1. Open `add_admin_role_and_audit_logs.sql`
2. Copy all contents
3. Paste into your database console/query tool
4. Execute

## Verification

After running the migration, verify it worked:

```sql
-- Check Flavio's role
SELECT id, email, role FROM "admins" WHERE "email" = 'flavioangeleu@gmail.com';
-- Expected: role should be 'superadmin'

-- Check audit_logs table exists
SELECT COUNT(*) FROM "audit_logs";
-- Expected: Should return 0 (no logs yet)

-- Check table structure
\d audit_logs
-- Expected: Should show all columns and indexes

-- Check all admins have roles
SELECT email, role FROM "admins";
-- Expected: All admins should have 'admin' or 'superadmin' role
```

## After Migration

1. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Restart your application** to pick up the new schema

3. **Test the implementation:**
   - Login as Flavio (should have superadmin access)
   - Try accessing `/superadmin/passwords`
   - Perform some admin actions and check `/superadmin/activity`

## Troubleshooting

### Error: "column already exists"
- The `role` column might already exist. The migration script handles this safely.
- Check if the column exists: `SELECT column_name FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'role';`

### Error: "relation audit_logs already exists"
- The table might already exist. The migration uses `CREATE TABLE IF NOT EXISTS` to handle this.
- Check if table exists: `SELECT * FROM information_schema.tables WHERE table_name = 'audit_logs';`

### Error: "constraint already exists"
- The foreign key might already exist. The migration script checks for this.
- Check constraints: `SELECT conname FROM pg_constraint WHERE conname = 'audit_logs_actor_id_fkey';`

### Flavio not promoted
- Check if Flavio's email exists: `SELECT email FROM "admins" WHERE "email" = 'flavioangeleu@gmail.com';`
- If no rows returned, Flavio doesn't exist in the database yet
- Manually promote: `UPDATE "admins" SET "role" = 'superadmin' WHERE "email" = 'flavioangeleu@gmail.com';`

## Rollback (if needed)

⚠️ **WARNING:** Rollback will delete all audit logs!

```bash
psql -h <host> -U <username> -d <database_name> -f rollback_admin_role_and_audit_logs.sql
```

Or run the rollback script manually in your database client.

## Notes

- The migration is **idempotent** - safe to run multiple times
- Uses `IF NOT EXISTS` and `IF EXISTS` checks to prevent errors
- All existing admins will have `role = 'admin'` by default
- Only Flavio will be promoted to `superadmin`
