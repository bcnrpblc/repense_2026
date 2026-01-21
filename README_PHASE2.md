# Phase 2 - Teacher Auth + Dashboard Shells + Protected Routes

This document describes the implementation of Phase 2 of the PG Repense system.

## Overview

Phase 2 implements:
- Teacher authentication API (login + me endpoints)
- Authentication pages for admin and teacher
- Protected route middleware with layouts
- Dashboard shells for admin and teacher
- API endpoints for dashboard data
- Navigation components

## Files Created

### API Endpoints

| File | Description |
|------|-------------|
| `app/api/auth/teacher/login/route.ts` | Teacher login endpoint |
| `app/api/auth/teacher/me/route.ts` | Get current teacher info |
| `app/api/admin/stats/route.ts` | Admin dashboard statistics |
| `app/api/teacher/classes/route.ts` | Teacher's assigned classes |

### Pages

| File | Description |
|------|-------------|
| `app/admin/login/page.tsx` | Admin login page |
| `app/admin/dashboard/page.tsx` | Admin dashboard |
| `app/admin/layout.tsx` | Admin protected layout |
| `app/teacher/login/page.tsx` | Teacher login page |
| `app/teacher/dashboard/page.tsx` | Teacher dashboard |
| `app/teacher/layout.tsx` | Teacher protected layout |

### Components

| File | Description |
|------|-------------|
| `app/components/LoginForm.tsx` | Reusable login form |
| `app/components/AdminNav.tsx` | Admin navigation sidebar |
| `app/components/TeacherNav.tsx` | Teacher navigation sidebar |
| `app/components/ui/Button.tsx` | Button component |
| `app/components/ui/Input.tsx` | Input component |
| `app/components/ui/Card.tsx` | Card components (Card, StatCard, NavCard) |
| `app/components/ui/index.ts` | UI components index |

### Library

| File | Description |
|------|-------------|
| `lib/auth.ts` | Authentication utilities (updated with teacher support) |
| `lib/hooks/useAuth.ts` | React hook for authentication |

## Testing Instructions

### Prerequisites

1. Ensure the database is set up and seeded:
```bash
npx prisma migrate dev
npx prisma db seed
```

2. Set the `JWT_SECRET` in your `.env` file:
```env
JWT_SECRET=your-secret-key-here
```

3. Start the development server:
```bash
npm run dev
```

### Testing Admin Authentication

1. **Login Page**: Navigate to `http://localhost:3000/admin/login`
   - Enter admin credentials (from seed data or create via API)
   - Should redirect to `/admin/dashboard` on success
   - Should show error message on invalid credentials

2. **Protected Routes**: Try accessing `http://localhost:3000/admin/dashboard` directly
   - Should redirect to login if not authenticated
   - Should show dashboard if authenticated

3. **Logout**: Click the "Sair" button in the sidebar
   - Should clear token and redirect to login page

### Testing Teacher Authentication

1. **Login Page**: Navigate to `http://localhost:3000/teacher/login`
   - Use teacher credentials from seed data:
     - Email: `ana.costa@repense.com.br`
     - Password: `teacher123` (or whatever was set in seed)
   - Should redirect to `/teacher/dashboard` on success

2. **Dashboard**: After login, verify:
   - Teacher name is displayed
   - Assigned classes are shown
   - Upcoming sessions are listed
   - Quick stats (total/active classes) are correct

3. **Protected Routes**: Try accessing `/teacher/dashboard` directly
   - Should redirect to login if not authenticated
   - Should redirect to login if authenticated as admin (wrong role)

### API Testing with cURL

#### Teacher Login
```bash
curl -X POST http://localhost:3000/api/auth/teacher/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ana.costa@repense.com.br", "password": "teacher123"}'
```

#### Get Teacher Info
```bash
curl http://localhost:3000/api/auth/teacher/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Get Admin Stats
```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Get Teacher Classes
```bash
curl http://localhost:3000/api/teacher/classes \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

## Authentication Flow

### Login Flow

1. User enters email/password on login page
2. Frontend calls `/api/auth/{admin|teacher}/login`
3. Backend validates credentials, checks active status (for teachers)
4. If valid, returns JWT token with payload:
   - Admin: `{ adminId, email }`
   - Teacher: `{ teacherId, email, role: "teacher" }`
5. Frontend stores token in localStorage
6. Frontend redirects to dashboard

### Protected Route Flow

1. Layout component uses `useAuth` hook
2. Hook checks for token in localStorage
3. If no token or expired, redirects to login
4. If token exists, decodes and validates role
5. If role mismatch, redirects to appropriate login
6. If valid, renders page content

### Logout Flow

1. User clicks "Sair" button
2. `logout()` function clears token from localStorage
3. User state is cleared
4. User is redirected to login page

## JWT Token Structure

### Admin Token
```json
{
  "adminId": "uuid",
  "email": "admin@example.com",
  "iat": 1234567890,
  "exp": 1235172690
}
```

### Teacher Token
```json
{
  "teacherId": "uuid",
  "email": "teacher@example.com",
  "role": "teacher",
  "iat": 1234567890,
  "exp": 1235172690
}
```

## Error Handling

### API Errors

| Code | Message | Description |
|------|---------|-------------|
| 400 | Dados inválidos | Validation error (Zod) |
| 401 | Credenciais inválidas | Wrong email or password |
| 401 | Não autorizado | Missing or invalid token |
| 403 | Professor inativo | Teacher is deactivated |
| 500 | Erro interno do servidor | Server error |

### Frontend Error Handling

- Form validation errors shown inline
- API errors shown as alert banners
- Network errors show connection error message
- Loading states with spinners

## Component Usage

### LoginForm
```tsx
<LoginForm
  title="Admin Login"
  role="admin"
  subtitle="Acesse o painel administrativo"
  redirectPath="/admin/dashboard"
/>
```

### useAuth Hook
```tsx
const { user, loading, logout, token } = useAuth({
  requiredRole: 'admin',
  redirectOnFail: true,
  loginPath: '/admin/login',
});
```

### UI Components
```tsx
import { Button, Input, Card, StatCard, NavCard } from '@/app/components/ui';

<Button variant="primary" loading={isLoading}>
  Submit
</Button>

<Input
  label="Email"
  type="email"
  error={errors.email}
/>

<StatCard
  title="Total Classes"
  value={150}
  icon={<ClassIcon />}
/>
```

## Known Limitations

- Token refresh is not implemented (tokens expire after 7 days)
- Password reset functionality not implemented
- Session management UI (Phase 3)
- Class creation/editing UI (Phase 3)
- Student check-in UI (Phase 3)

## Next Steps (Phase 3)

1. Class management UI for admins
2. Session management UI for teachers
3. Student check-in flow
4. Reports and analytics
