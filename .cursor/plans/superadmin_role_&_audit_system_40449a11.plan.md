---
name: Superadmin Role & Audit System
overview: Implement a comprehensive superadmin role with password management capabilities and a full audit logging system with activity timeline UI, following security-first principles and reusing existing authentication patterns.
todos: []
isProject: false
---

# Superadmin Role & Comprehensive Audit System Implementation Plan

## Overview

This plan implements a 4-phase rollout of superadmin role, password management, audit logging, and activity timeline UI. The implementation follows existing patterns in the codebase and prioritizes security.

## Current Architecture Understanding

**Authentication Pattern:**

- JWT-based auth with `verifyAdminToken()` in `lib/auth.ts`
- Admin model in Prisma: `id`, `email`, `password_hash`, `criado_em`
- Token payload: `{ adminId: string, email: string }`
- API routes use `verifyAdminToken(request)` for auth checks
- Rate limiting via `lib/rateLimit.ts` with configs (auth: 10/min, strict: 5/min)

**Database:**

- Prisma ORM with PostgreSQL
- Admin table at `prisma/schema.prisma:54-62`
- No existing role field or audit logging

**UI Patterns:**

- Admin layout with sidebar navigation (`app/admin/layout.tsx`)
- Card components (`app/components/ui/Card.tsx`)
- Button components (`app/components/ui/Button.tsx`)
- AdminNav component for sidebar (`app/components/AdminNav.tsx`)

---

## Phase 1: Superadmin Role & Promotion

### 1.1 Database Schema Changes

**File: `prisma/schema.prisma`**

Add `role` field to Admin model:

```prisma
model Admin {
  id              String            @id @default(uuid())
  email           String            @unique
  password_hash   String
  role            String            @default("admin") // 'admin' | 'superadmin'
  criado_em       DateTime          @default(now())
  NotificationRead NotificationRead[]
  AuditLog        AuditLog[]        // Add relation for Phase 3

  @@map("admins")
}
```

**Migration:**

- Create migration: `npx prisma migrate dev --name add_admin_role`
- Add promotion script in migration or separate SQL file

### 1.2 Promotion Migration Script

**File: `prisma/migrations/YYYYMMDDHHMMSS_add_admin_role/migration.sql`**

Add promotion SQL:

```sql
-- Add role column with default 'admin'
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'admin';

-- Promote specific admin to superadmin
UPDATE "admins" 
SET "role" = 'superadmin' 
WHERE "email" = 'flavioangeleu@gmail.com';

-- Verify promotion (should return 1 row)
SELECT id, email, role FROM "admins" WHERE "email" = 'flavioangeleu@gmail.com';
```

**Alternative: Create promotion script file**

**File: `prisma/scripts/promote-superadmin.ts`**

- Verify admin exists before promoting
- Log promotion action (after Phase 3 audit system is ready)
- Exit with error if admin not found

### 1.3 Authorization Helper

**File: `lib/auth.ts`** (extend existing file)

Add superadmin verification function:

```typescript
/**
 * Verify admin token and check if user is superadmin
 * Throws ForbiddenError if not superadmin
 * 
 * @param request - Next.js request object
 * @returns Promise<{ adminId: string, email: string, role: string }>
 * @throws Error if not authenticated or not superadmin
 */
export async function requireSuperadmin(request: NextRequest): Promise<{
  adminId: string;
  email: string;
  role: string;
}> {
  // First verify admin token
  const tokenPayload = await verifyAdminToken(request);
  
  // Fetch admin from database to check role
  const admin = await prisma.admin.findUnique({
    where: { id: tokenPayload.adminId },
    select: { id: true, email: true, role: true }
  });
  
  if (!admin) {
    throw new Error('Admin not found');
  }
  
  if (admin.role !== 'superadmin') {
    throw new ForbiddenError('Superadmin access required');
  }
  
  return {
    adminId: admin.id,
    email: admin.email,
    role: admin.role
  };
}
```

**File: `lib/errors.ts`** (create new file for custom errors)

```typescript
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
```

### 1.4 Update JWT Token Payload (Optional Enhancement)

**File: `app/api/auth/admin/login/route.ts`**

Include role in JWT token (optional, for client-side checks):

```typescript
const token = jwt.sign(
  { 
    adminId: admin.id, 
    email: admin.email,
    role: admin.role // Add role to token
  },
  process.env.JWT_SECRET!,
  { expiresIn }
);
```

**File: `lib/auth.ts`**

Update `AdminTokenPayload` type:

```typescript
export type AdminTokenPayload = {
  adminId: string;
  email: string;
  role?: 'admin' | 'superadmin'; // Update type
};
```

### 1.5 Test Superadmin Access

Create test endpoint to verify superadmin access:

**File: `app/api/superadmin/test/route.ts`**

- Use `requireSuperadmin()` helper
- Return 403 for non-superadmin
- Return 200 for superadmin

---

## Phase 2: Password Management Feature

### 2.1 Password Generation Utility

**File: `lib/password.ts`** (create new file)

```typescript
import crypto from 'crypto';

/**
 * Generate secure random password
 * Format: 12-16 chars, mixed case, numbers, special chars
 */
export function generateRandomPassword(): string {
  const length = 12 + Math.floor(Math.random() * 5); // 12-16 chars
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = lowercase + uppercase + numbers + special;
  
  // Ensure at least one of each type
  let password = 
    lowercase[Math.floor(Math.random() * lowercase.length)] +
    uppercase[Math.floor(Math.random() * uppercase.length)] +
    numbers[Math.floor(Math.random() * numbers.length)] +
    special[Math.floor(Math.random() * special.length)];
  
  // Fill rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
```

### 2.2 Password Reset API Endpoint

**File: `app/api/superadmin/users/[id]/reset-password/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { requireSuperadmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateRandomPassword } from '@/lib/password';
import { rateLimit, RateLimitConfigs } from '@/lib/rateLimit';
// Import logAuditEvent from Phase 3 (will be available later)

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).optional(), // Optional - auto-generate if not provided
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limit: 10 resets per hour per superadmin
  const rateLimitResult = rateLimit(request, {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'password-reset'
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    // Verify superadmin access
    const superadmin = await requireSuperadmin(request);
    
    const body = await request.json();
    const { newPassword } = resetPasswordSchema.parse(body);
    
    // Generate password if not provided
    const plainPassword = newPassword || generateRandomPassword();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // Determine user type and update
    // Check if it's an admin, teacher, or student
    let user = await prisma.admin.findUnique({ where: { id: params.id } });
    let userType = 'admin';
    
    if (!user) {
      user = await prisma.teacher.findUnique({ where: { id: params.id } });
      userType = 'teacher';
    }
    
    if (!user) {
      // Check if it's a student (students don't have passwords in current schema)
      // This might need to be handled differently
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Update password based on user type
    if (userType === 'admin') {
      await prisma.admin.update({
        where: { id: params.id },
        data: { password_hash: hashedPassword }
      });
    } else if (userType === 'teacher') {
      await prisma.teacher.update({
        where: { id: params.id },
        data: { password_hash: hashedPassword }
      });
    }
    
    // Log audit event (Phase 3)
    // await logAuditEvent({
    //   event_type: 'admin_password_reset',
    //   actor_id: superadmin.adminId,
    //   actor_type: 'admin',
    //   target_entity: userType === 'admin' ? 'Admin' : 'Teacher',
    //   target_id: params.id,
    //   action: 'password_reset',
    //   metadata: { target_email: user.email },
    //   status: 'success'
    // }, request);
    
    // Return plaintext password ONLY ONCE (never store)
    return NextResponse.json({
      success: true,
      newPassword: plainPassword, // Only returned once
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    // Handle errors (ForbiddenError, validation, etc.)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: 'Superadmin access required' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Note:** Students don't have passwords in current schema. This endpoint will handle Admin and Teacher only. If a student ID is provided, returns 404 error.

### 2.3 User List API Endpoint

**File: `app/api/superadmin/users/route.ts`**

Endpoint to list all users (admins, teachers) for password management:

```typescript
export async function GET(request: NextRequest) {
  try {
    await requireSuperadmin(request);
    
    const [admins, teachers] = await Promise.all([
      prisma.admin.findMany({
        select: { id: true, email: true, role: true, criado_em: true }
      }),
      prisma.teacher.findMany({
        select: { id: true, nome: true, email: true, eh_ativo: true, criado_em: true }
      })
    ]);
    
    return NextResponse.json({
      admins: admins.map(a => ({ ...a, type: 'admin' })),
      teachers: teachers.map(t => ({ ...t, type: 'teacher' }))
    });
  } catch (error) {
    // Error handling
  }
}
```

### 2.4 Password Management UI

**File: `app/superadmin/passwords/page.tsx`**

Create password management page:

- User list (admins + teachers) with search/filter
- "Redefinir Senha" button per user
- Modal for password reset confirmation
- Display generated password with copy button
- Only accessible to superadmin (check in layout or page)

**File: `app/superadmin/layout.tsx`** (create new layout)

Similar to `app/admin/layout.tsx` but with superadmin check:

```typescript
function ProtectedSuperadminContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth({
    requiredRole: 'admin', // Will check role in API
    redirectOnFail: true,
    loginPath: '/admin/login',
  });
  
  // Additional check: verify user is superadmin via API
  // If not superadmin, redirect to /admin/dashboard
  
  return <div>{children}</div>;
}
```

**File: `app/components/SuperadminNav.tsx`** (create new nav component)

Similar to `AdminNav.tsx` but with superadmin-specific menu items:

- Dashboard
- Gerenciar Senhas
- Histórico de Atividades (Phase 4)
- Logout

### 2.5 Update Admin Navigation

**File: `app/components/AdminNav.tsx`**

Add conditional superadmin menu items:

- Check user role (from token or API call)
- Show "Gerenciar Senhas" and "Histórico" only if `role === 'superadmin'`

---

## Phase 3: Comprehensive Audit Logging System

### 3.1 Audit Log Database Schema

**File: `prisma/schema.prisma`**

Add AuditLog model:

```prisma
model AuditLog {
  id              String   @id @default(uuid())
  event_type      String   // e.g., 'data_student_update', 'auth_login_success'
  actor_id        String?  // Admin/Teacher ID who performed action
  actor_type      String?  // 'admin' | 'teacher' | 'student' | 'system'
  target_entity   String?  // 'Student', 'Class', 'Enrollment', etc.
  target_id       String?  // ID of affected record
  action          String?  // 'create' | 'update' | 'delete' | 'view' | 'login'
  metadata        Json?    // Flexible JSON for event-specific data
  ip_address      String?
  user_agent      String?
  status          String   @default("success") // 'success' | 'failure' | 'error'
  error_message   String?
  criado_em       DateTime @default(now())
  
  // Relations
  Actor           Admin?   @relation(fields: [actor_id], references: [id])
  
  @@index([event_type, criado_em])
  @@index([actor_id, criado_em])
  @@index([target_entity, target_id])
  @@index([criado_em])
  @@map("audit_logs")
}
```

Update Admin model to add relation:

```prisma
model Admin {
  // ... existing fields
  AuditLog        AuditLog[]        @relation("Actor")
}
```

**Migration:** `npx prisma migrate dev --name add_audit_logs`

### 3.2 Audit Logging Helper

**File: `lib/audit.ts`** (create new file)

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface AuditEventData {
  event_type: string;
  actor_id?: string;
  actor_type?: 'admin' | 'teacher' | 'student' | 'system';
  target_entity?: string;
  target_id?: string;
  action?: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | string;
  metadata?: Record<string, any>;
  status?: 'success' | 'failure' | 'error';
  error_message?: string;
}

/**
 * Fallback console logger for audit event failures
 * Used when database logging fails - ensures we don't lose critical audit information
 */
function logAuditEventToFallback(data: AuditEventData, error: any, request?: NextRequest): void {
  const timestamp = new Date().toISOString();
  const ip_address = request?.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     request?.headers.get('x-real-ip') ||
                     'unknown';
  const user_agent = request?.headers.get('user-agent') || 'unknown';
  
  // Log to console with structured format for easy parsing
  console.error('[AUDIT_LOG_FAILURE]', {
    timestamp,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : String(error),
    event_data: {
      ...data,
      ip_address,
      user_agent
    }
  });
}

/**
 * Log audit event asynchronously (fire-and-forget)
 * Never throws errors to avoid breaking main request flow
 * Failures are logged to fallback console for monitoring
 */
export async function logAuditEvent(
  data: AuditEventData,
  request?: NextRequest
): Promise<void> {
  try {
    // Extract IP and user agent from request
    const ip_address = request?.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                       request?.headers.get('x-real-ip') ||
                       'unknown';
    const user_agent = request?.headers.get('user-agent') || 'unknown';
    
    // Fire-and-forget: don't await to avoid blocking
    prisma.auditLog.create({
      data: {
        ...data,
        ip_address,
        user_agent,
        status: data.status || 'success'
      }
    }).catch((error) => {
      // Log to fallback console with full context
      logAuditEventToFallback(data, error, request);
    });
  } catch (error) {
    // Never let audit logging crash the app
    // Log to fallback console with full context
    logAuditEventToFallback(data, error, request);
  }
}
```

### 3.3 Integration Points

**Authentication Events:**

**File: `app/api/auth/admin/login/route.ts`**

```typescript
// After successful login
await logAuditEvent({
  event_type: 'auth_login_success',
  actor_id: admin.id,
  actor_type: 'admin',
  action: 'login',
  metadata: { email: admin.email }
}, request);

// After failed login
await logAuditEvent({
  event_type: 'auth_login_failure',
  actor_type: 'admin',
  action: 'login',
  status: 'failure',
  metadata: { email, reason: 'Invalid credentials' }
}, request);
```

**Data Change Events:**

**File: `app/api/admin/students/[id]/route.ts`** (PUT method)

```typescript
// Before update
const oldData = await prisma.student.findUnique({ where: { id: studentId } });

// Perform update
const updatedStudent = await prisma.student.update({ ... });

// Log the change
await logAuditEvent({
  event_type: 'data_student_update',
  actor_id: tokenPayload.adminId,
  actor_type: 'admin',
  target_entity: 'Student',
  target_id: studentId,
  action: 'update',
  metadata: {
    changed_fields: getChangedFields(oldData, updatedStudent),
    // Redact sensitive data: don't log full phone/email
    old_values: { nome: oldData.nome, telefone: maskPhone(oldData.telefone) },
    new_values: { nome: updatedStudent.nome, telefone: maskPhone(updatedStudent.telefone) }
  }
}, request);
```

**Helper function for field comparison:**

**File: `lib/audit.ts`** (add helper)

```typescript
export function getChangedFields<T extends Record<string, any>>(
  oldData: T,
  newData: T
): string[] {
  const changed: string[] = [];
  for (const key in newData) {
    if (oldData[key] !== newData[key]) {
      changed.push(key);
    }
  }
  return changed;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone;
  return '***' + phone.slice(-4);
}
```

**Critical Integration Points:**

1. Student CRUD: `app/api/admin/students/route.ts` (GET, POST), `app/api/admin/students/[id]/route.ts` (PUT, DELETE)
2. Class CRUD: `app/api/admin/classes/route.ts`, `app/api/admin/classes/[id]/route.ts`
3. Enrollment operations: `app/api/admin/enrollments/[id]/complete/route.ts`, `app/api/admin/enrollments/[id]/cancel/route.ts`
4. Password reset: `app/api/superadmin/users/[id]/reset-password/route.ts` (Phase 2)
5. Admin actions: Archive class, move student, etc.

**Event Types to Implement:**

- `auth_login_success`, `auth_login_failure`, `auth_logout`
- `data_student_create`, `data_student_update`, `data_student_delete`
- `data_class_create`, `data_class_update`, `data_class_delete`
- `data_enrollment_create`, `data_enrollment_update`, `data_enrollment_delete`
- `admin_password_reset`
- `permission_role_change` (when promoting to superadmin)

---

## Phase 4: Activity Timeline UI

### 4.1 Audit Logs API Endpoint

**File: `app/api/superadmin/audit-logs/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireSuperadmin(request);
    
    const { searchParams } = new URL(request.url);
    const event_type = searchParams.get('event_type');
    const actor_id = searchParams.get('actor_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const target_entity = searchParams.get('target_entity');
    const status = searchParams.get('status');
    const search = searchParams.get('search'); // Free text search
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: any = {};
    
    if (event_type) where.event_type = event_type;
    if (actor_id) where.actor_id = actor_id;
    if (target_entity) where.target_entity = target_entity;
    if (status) where.status = status;
    
    if (start_date && end_date) {
      where.criado_em = {
        gte: new Date(start_date),
        lte: new Date(end_date)
      };
    }
    
    // Free text search using raw SQL for metadata JSON search
    // Prisma has limited JSON search capabilities, so we use raw SQL
    if (search) {
      // Use Prisma's raw SQL for JSON metadata search
      const searchQuery = `
        SELECT * FROM "audit_logs"
        WHERE (
          "event_type" ILIKE $1 OR
          "target_entity" ILIKE $1 OR
          "metadata"::text ILIKE $1 OR
          EXISTS (
            SELECT 1 FROM "admins" 
            WHERE "admins"."id" = "audit_logs"."actor_id" 
            AND "admins"."email" ILIKE $1
          )
        )
        ${event_type ? `AND "event_type" = $2` : ''}
        ${actor_id ? `AND "actor_id" = $3` : ''}
        ${target_entity ? `AND "target_entity" = $4` : ''}
        ${status ? `AND "status" = $5` : ''}
        ${start_date && end_date ? `AND "criado_em" BETWEEN $6 AND $7` : ''}
        ORDER BY "criado_em" DESC
        LIMIT $8 OFFSET $9
      `;
      
      const params: any[] = [`%${search}%`];
      let paramIndex = 2;
      if (event_type) params.push(event_type);
      if (actor_id) params.push(actor_id);
      if (target_entity) params.push(target_entity);
      if (status) params.push(status);
      if (start_date && end_date) {
        params.push(new Date(start_date), new Date(end_date));
      }
      params.push(limit, skip);
      
      const logs = await prisma.$queryRawUnsafe(searchQuery, ...params);
      const totalResult = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "audit_logs" WHERE ...`,
        ...
      );
      
      return NextResponse.json({
        logs,
        pagination: { total: parseInt(totalResult[0].count), page, limit, totalPages: Math.ceil(total / limit) }
      });
    } else {
      // Use Prisma for non-search queries (faster)
      where.OR = [
        { event_type: { contains: search, mode: 'insensitive' } },
        { target_entity: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          Actor: {
            select: { id: true, email: true, role: true }
          }
        },
        orderBy: { criado_em: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);
    
    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    // Error handling
  }
}
```

### 4.2 Activity Timeline UI Page

**File: `app/superadmin/activity/page.tsx`**

Create activity timeline page with:

- Filter sidebar (event type, actor, date range, status, target entity)
- Search bar (uses raw SQL for metadata search)
- Timeline list (reverse chronological)
- **Auto-refresh every 30 seconds** (polling)
- Manual refresh button
- Pagination or infinite scroll
- Event detail expansion
- Export CSV button

**Auto-refresh Implementation:**

```typescript
useEffect(() => {
  // Initial load
  fetchLogs();
  
  // Auto-refresh every 30 seconds
  const interval = setInterval(() => {
    fetchLogs();
  }, 30000);
  
  return () => clearInterval(interval);
}, [filters, search]);
```

**Components needed:**

- `EventCard` component for each log entry
- `EventFilters` component for filter sidebar
- `EventDetailModal` or expandable section

### 4.3 Event Card Component

**File: `app/components/EventCard.tsx`**

Display individual audit log entry:

- Icon based on event type (🔑 auth, ✏️ data, 🛡️ admin, ⚠️ error)
- Timestamp (relative + absolute on hover)
- Actor name + role
- Action description in natural language
- Target entity with link (if applicable)
- Expandable metadata section

### 4.4 Export CSV Functionality

**File: `app/api/superadmin/audit-logs/export/route.ts`**

Export filtered logs to CSV:

- Respects same filters as GET endpoint
- Max 10,000 rows
- Exports: event_type, timestamp, actor, target, action, status
- Returns CSV file download

---

## Implementation Order & Dependencies

1. **Phase 1** (Week 1): Database schema + role field + promotion + `requireSuperadmin()` helper
2. **Phase 2** (Week 2): Password management (depends on Phase 1 for superadmin check)
3. **Phase 3** (Week 3): Audit logging infrastructure + integrate critical events (can start in parallel with Phase 2)
4. **Phase 4** (Week 4): Activity timeline UI (depends on Phase 3)

---

## Security Considerations

1. **Superadmin Access Control:**
  - All superadmin routes use `requireSuperadmin()` helper
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Returns 403 Forbidden for non-superadmin
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Role checked from database (not just JWT token)
2. **Password Reset Security:**
  - Rate limiting: 10 resets/hour per superadmin
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Plaintext password shown only once, never stored
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - All password resets logged in audit system
3. **Audit Log Immutability:**
  - No edit/delete endpoints for audit logs
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Database-level constraints (if possible) to prevent modification
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Application-level checks: no update/delete methods in API
4. **Sensitive Data Redaction:**
  - Passwords never logged
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Phone numbers masked (show last 4 digits)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Emails can be logged but consider redaction for GDPR

---

## Testing Strategy

1. **Phase 1:**
  - Test `requireSuperadmin()` returns 403 for regular admin
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Test `requireSuperadmin()` returns 200 for superadmin
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Verify promotion migration works
2. **Phase 2:**
  - Test password reset endpoint with rate limiting
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Test password generation (strength, uniqueness)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Test UI accessibility (only superadmin can access)
3. **Phase 3:**
  - Test audit logging doesn't break existing endpoints
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Verify all critical events are logged
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Test async logging (shouldn't slow down requests)
4. **Phase 4:**
  - Test filtering and search
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Test pagination performance with large datasets
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        - Test CSV export

---

## Files to Create/Modify

**New Files:**

- `lib/errors.ts` - Custom error classes
- `lib/password.ts` - Password generation
- `lib/audit.ts` - Audit logging helper with fallback console logging
- `app/api/superadmin/test/route.ts` - Test endpoint
- `app/api/superadmin/users/route.ts` - User list
- `app/api/superadmin/users/[id]/reset-password/route.ts` - Password reset
- `app/api/superadmin/audit-logs/route.ts` - Audit logs API (with raw SQL search)
- `app/api/superadmin/audit-logs/export/route.ts` - CSV export
- `app/superadmin/layout.tsx` - Superadmin layout
- `app/superadmin/passwords/page.tsx` - Password management UI
- `app/superadmin/activity/page.tsx` - Activity timeline UI (with auto-refresh)
- `app/components/SuperadminNav.tsx` - Superadmin navigation
- `app/components/EventCard.tsx` - Event card component
- `prisma/migrations/.../migration.sql` - Role field migration
- `prisma/scripts/archive-audit-logs.ts` - Archive script for logs >6 months

**Modified Files:**

- `prisma/schema.prisma` - Add role field, AuditLog model
- `lib/auth.ts` - Add `requireSuperadmin()` function, update types
- `app/api/auth/admin/login/route.ts` - Add role to JWT, log auth events
- `app/api/admin/students/route.ts` - Add audit logging
- `app/api/admin/students/[id]/route.ts` - Add audit logging
- `app/api/admin/classes/route.ts` - Add audit logging
- `app/api/admin/classes/[id]/route.ts` - Add audit logging
- `app/api/admin/enrollments/[id]/complete/route.ts` - Add audit logging
- `app/api/admin/enrollments/[id]/cancel/route.ts` - Add audit logging
- `app/components/AdminNav.tsx` - Add superadmin menu items conditionally

---

## Decisions Made

1. **Async Logging:** ✅ **Fire-and-forget Promise** with try/catch and fallback console logging
  - Wrapped in try/catch blocks
                                                                                                                                                                        - Failures logged to structured console output with `[AUDIT_LOG_FAILURE]` prefix
                                                                                                                                                                        - Fallback ensures no audit events are completely lost
                                                                                                                                                                        - Can upgrade to job queue (BullMQ) later if needed for high volume
2. **Log Retention:** ✅ **Archive after 6 months**
  - Create archive script to move logs older than 6 months to `audit_logs_archive` table
                                                                                                                                                                        - Archive process can run as scheduled job (cron)
                                                                                                                                                                        - Archived logs remain queryable but in separate table for performance
3. **Password Reset Security:** ✅ **No re-authentication required**
  - Superadmin can reset passwords without re-entering their own password
                                                                                                                                                                        - Rate limiting (10/hour) provides sufficient protection
                                                                                                                                                                        - All resets logged in audit system
4. **Force Password Change:** ✅ **No forced password change**
  - Users can continue using reset password
                                                                                                                                                                        - Optional: Add flag for "must_change_password" in future if needed
5. **Student Passwords:** ✅ **No handling** (students don't have passwords)
  - Password reset endpoint only handles Admin and Teacher
                                                                                                                                                                        - Returns 404 if student ID is provided
6. **Metadata Search:** ✅ **Use raw SQL** for JSON metadata search
  - Prisma's JSON search is limited
                                                                                                                                                                        - Use `prisma.$queryRawUnsafe()` for full-text search in metadata JSON
                                                                                                                                                                        - Fallback to Prisma for non-search queries (better performance)
7. **Real-time Updates:** ✅ **Auto-refresh logs**
  - Activity timeline page auto-refreshes every 30 seconds
                                                                                                                                                                        - Manual refresh button also available
                                                                                                                                                                        - Use React `useEffect` with interval for polling
                                                                                                                                                                        - Consider WebSockets in future for true real-time

---

## Success Criteria

- Superadmin role created and Flavio promoted
- `requireSuperadmin()` helper works correctly
- Password reset feature functional with rate limiting
- All critical events logged (auth + data changes + admin actions)
- Activity timeline UI displays logs with filtering
- CSV export works with filters
- No sensitive data in logs (passwords, full phone numbers)
- Performance: Audit logging doesn't slow down requests (<50ms overhead)
- Security: All superadmin routes properly protected

