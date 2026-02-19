# Task: Admin-with-Teacher-Account Switch (No Re-Login)

**Status:** To be implemented later  
**Priority:** Medium  
**Context:** Mirror the teacher-admin flow so admins with a Teacher account can access teacher pages without re-login.

---

## Problem

- **Teacher-admin** (logs in at /teacher/login): clicks "Painel Admin" → same token works → no re-login ✓  
- **Admin-with-teacher-account** (logs in at /admin/login): clicks "Painel Facilitador" → admin token rejected → must re-login ✗

## Solution

Add `verifyTeacherOrAdminWithTeacherAccountToken` (mirror of `verifyAdminOrTeacherAdminToken`) and use it for teacher routes and layout, so admin tokens are accepted when the admin has an active Teacher account (same email).

---

## Implementation Steps (verify step by step)

### Step 1: Add verifier in lib/auth.ts

Create `verifyTeacherOrAdminWithTeacherAccountToken`:

- **If token has teacherId** → load teacher, ensure `eh_ativo` → return teacher payload (teacherId, email, role).
- **If token has adminId** → load admin, find Teacher with same email and `eh_ativo: true` → if found, return teacher payload (using teacher.id as teacherId).

Return type: `{ teacherId: string; email: string; role: 'teacher'; isAdminWithTeacherAccount: boolean }`

### Step 2: Update /api/auth/teacher/me

- Replace `verifyTeacherToken` with `verifyTeacherOrAdminWithTeacherAccountToken`.
- When `isAdminWithTeacherAccount` is true, return teacher data (teacher.id, nome, email, etc.) in the same shape as for teacher tokens.

### Step 3: Add requiredTeacherAccess to useAuth

- In `lib/hooks/useAuth.ts`, add option `requiredTeacherAccess?: boolean`.
- When true: accept teacher token OR admin token when admin has teacher account (check via `/api/auth/teacher/me` response or JWT + API).

### Step 4: Update teacher layout

- Replace `requiredRole: 'teacher'` with `requiredTeacherAccess: true` in `app/teacher/layout.tsx` (ProtectedTeacherContent).

### Step 5: Update teacher API routes

Replace `verifyTeacherToken` with `verifyTeacherOrAdminWithTeacherAccountToken` in:

- app/api/teacher/conversations/route.ts
- app/api/teacher/conversations/[id]/route.ts
- app/api/teacher/conversations/[id]/messages/route.ts
- app/api/teacher/at-risk-students/route.ts
- app/api/teacher/classes/route.ts
- app/api/teacher/classes/[id]/students/route.ts
- app/api/teacher/classes/[id]/sessions/route.ts
- app/api/teacher/classes/[id]/final-report/route.ts
- app/api/teacher/notifications/route.ts
- app/api/teacher/notifications/count/route.ts
- app/api/teacher/notifications/mark-read/route.ts
- app/api/teacher/sessions/route.ts
- app/api/teacher/sessions/active/route.ts
- app/api/teacher/sessions/[id]/route.ts
- app/api/teacher/sessions/[id]/attendance/route.ts
- app/api/teacher/students/[id]/route.ts
- app/api/teacher/students/[id]/report/route.ts
- app/api/teacher/admins/route.ts
- app/api/auth/teacher/change-password/route.ts

(Use grep to confirm all `verifyTeacherToken` usages.)

### Step 6: Update teacher pages using useAuth

- Any teacher page that uses `useAuth({ requiredRole: 'teacher' })` should use `requiredTeacherAccess: true` instead, so admin-with-teacher-account is allowed.

### Step 7: Test

1. Create or use an admin with a Teacher account (same email in both Admin and Teacher tables).
2. Log in at /admin/login.
3. Click "Painel Facilitador" in AdminNav.
4. Confirm: no redirect to /teacher/login, teacher dashboard loads, teacher APIs succeed.
5. Switch back to admin (Painel Admin if applicable) and confirm no regressions.
6. Confirm pure teachers (no admin account) still work.
7. Confirm pure admins (no teacher account) cannot access teacher routes.

---

## Files to modify

| File | Change |
|------|--------|
| lib/auth.ts | Add `verifyTeacherOrAdminWithTeacherAccountToken` |
| app/api/auth/teacher/me/route.ts | Use new verifier |
| lib/hooks/useAuth.ts | Add `requiredTeacherAccess` option |
| app/teacher/layout.tsx | Use `requiredTeacherAccess: true` |
| app/api/teacher/*/route.ts | Replace verifyTeacherToken with new verifier |
| Teacher pages with useAuth | Use requiredTeacherAccess where appropriate |

---

## Reference

- Teacher-admin flow: `verifyAdminOrTeacherAdminToken` in lib/auth.ts (lines 165-212)
- Admin layout: `requiredAdminAccess: true` in app/admin/layout.tsx
- Admin /me: app/api/auth/admin/me/route.ts
