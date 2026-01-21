# Phase 4 - Teacher Session Management + Admin Analytics

This document describes the implementation of Phase 4 of the PG Repense system.

## Overview

Phase 4 implements:
- Teacher session management (create, manage attendance, finalize)
- Active session detection and enforcement (one session at a time)
- Attendance tracking with observations
- Session reports/relatorio
- Admin class detail page with sessions and statistics
- Admin analytics dashboard with charts

## New Dependencies

```bash
npm install recharts
```

## Files Created

### API Endpoints

| File | Method | Description |
|------|--------|-------------|
| `app/api/teacher/sessions/route.ts` | POST | Create a new session for a class |
| `app/api/teacher/sessions/active/route.ts` | GET | Get teacher's active session (if any) |
| `app/api/teacher/sessions/[id]/route.ts` | GET | Get session details |
| `app/api/teacher/sessions/[id]/route.ts` | PUT | Update session (add relatorio, finalize) |
| `app/api/teacher/sessions/[id]/attendance/route.ts` | GET | Get attendance records |
| `app/api/teacher/sessions/[id]/attendance/route.ts` | POST | Save attendance records (upsert) |
| `app/api/admin/classes/[id]/sessions/route.ts` | GET | Get all sessions for a class (admin view) |
| `app/api/admin/sessions/[id]/route.ts` | GET | Get session details (admin view) |
| `app/api/admin/analytics/overview/route.ts` | GET | Get analytics overview data |

### Pages

| File | Description |
|------|-------------|
| `app/teacher/dashboard/page.tsx` | Updated: Active session banner, start session buttons |
| `app/teacher/classes/page.tsx` | Teacher's class list with filters |
| `app/teacher/classes/[id]/page.tsx` | Class detail with session history |
| `app/teacher/classes/[id]/session/page.tsx` | Session management (attendance + report) |
| `app/admin/classes/[id]/page.tsx` | Admin class detail with tabs |
| `app/admin/reports/page.tsx` | Analytics dashboard with charts |

### Components

| File | Description |
|------|-------------|
| `app/components/SessionDetailModal.tsx` | Modal for viewing session details |
| `app/components/TeacherNav.tsx` | Updated: Active session indicator, enabled links |

## Business Rules

### Session Creation
- Teacher must own the class to create a session
- Teacher cannot have multiple active sessions (one at a time)
- Session `numero_sessao` auto-increments based on previous sessions
- `data_sessao` is set to the current timestamp

### Active Session Detection
- A session is "active" when `relatorio` is `null`
- Once `relatorio` is filled, the session is "completed"
- Teachers see an active session banner if one exists
- "Iniciar Sessão" button is disabled while teacher has an active session

### Attendance Tracking
- All enrolled students are shown for attendance
- Checkbox for presence (presente/ausente)
- Optional observation text per student
- "Mark All Present" button for convenience
- Attendance records use upsert for idempotency
- Atomic transaction for saving all records

### Session Finalization
- `relatorio` (report) is required to finalize
- Once finalized, session cannot be edited
- Teacher can save attendance and exit to continue later

## Testing Checklist

### Prerequisites

1. Ensure database is seeded with test data:
```bash
npx prisma db seed
```

2. Start the development server:
```bash
npm run dev
```

3. Login as teacher at `/teacher/login`

### Session Management (Teacher)

- [ ] Navigate to `/teacher/dashboard`
- [ ] Verify classes are displayed with "Iniciar Sessão" button
- [ ] Click "Iniciar Sessão" on a class
- [ ] Verify redirect to session page
- [ ] Verify student list is displayed
- [ ] Check/uncheck students for attendance
- [ ] Add observation to a student
- [ ] Click "Marcar Todos Presentes"
- [ ] Click "Salvar Presenças"
- [ ] Verify success message
- [ ] Fill in the "Relatório da Aula" textarea
- [ ] Click "Finalizar Sessão"
- [ ] Verify redirect to dashboard
- [ ] Verify session banner is gone

### Active Session Enforcement

- [ ] Start a session in one class
- [ ] Try to start session in another class (should be blocked)
- [ ] Verify error message about active session
- [ ] Navigate to active session and finalize it
- [ ] Now able to start new session

### Teacher Navigation

- [ ] Verify "Minhas Turmas" link is enabled
- [ ] Click to navigate to `/teacher/classes`
- [ ] Verify class list with filters
- [ ] Click on a class to see details
- [ ] Verify session history displays

### Active Session Indicator

- [ ] Start a session
- [ ] Verify green banner appears on dashboard
- [ ] Verify green indicator in navigation sidebar
- [ ] Click indicator to go to active session

### Admin Class Detail

- [ ] Login as admin
- [ ] Navigate to `/admin/classes`
- [ ] Click on a class row
- [ ] Verify tabs: Alunos, Sessões, Estatísticas
- [ ] Click "Alunos" tab - verify student list
- [ ] Click "Sessões" tab - verify session list
- [ ] Click on a session to view details in modal
- [ ] Click "Estatísticas" tab - verify charts

### Admin Analytics Dashboard

- [ ] Navigate to `/admin/reports`
- [ ] Verify summary cards display correct numbers
- [ ] Verify "Inscrições por Grupo Repense" bar chart
- [ ] Verify "Inscrições por Cidade" pie chart
- [ ] Verify "Sessões por Semana" line chart
- [ ] Verify "Taxa de Ocupação por Turma" horizontal bar chart
- [ ] Verify "Inscrições por Status" table

### Mobile Responsiveness

- [ ] Test teacher session page on mobile
- [ ] Verify checkboxes have large touch targets
- [ ] Verify observation inputs are usable
- [ ] Test admin reports page on mobile
- [ ] Verify charts are responsive

## API Documentation

### POST /api/teacher/sessions

Creates a new session.

**Request Body:**
```json
{
  "classId": "uuid"
}
```

**Success Response (201):**
```json
{
  "session": {
    "id": "uuid",
    "numero_sessao": 3,
    "data_sessao": "2024-01-22T19:00:00.000Z",
    "relatorio": null,
    "class": {
      "id": "uuid",
      "grupo_repense": "Igreja",
      "modelo": "presencial",
      "horario": "Segunda 19h",
      "cidade": "Itu",
      "numero_sessoes": 8
    }
  },
  "students": [
    {
      "studentId": "uuid",
      "nome": "Student Name",
      "email": "student@example.com",
      "telefone": "11999999999"
    }
  ]
}
```

**Error Response (400 - Active session exists):**
```json
{
  "error": "Você já tem uma sessão ativa",
  "activeSession": {
    "id": "uuid",
    "classId": "uuid",
    "className": "Igreja - Segunda 19h",
    "numero_sessao": 2
  }
}
```

### GET /api/teacher/sessions/active

Returns the teacher's active session if one exists.

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "numero_sessao": 3,
    "data_sessao": "2024-01-22T19:00:00.000Z",
    "relatorio": null,
    "class": { ... },
    "students": [
      {
        "studentId": "uuid",
        "nome": "Student Name",
        "attendance": {
          "presente": true,
          "observacao": "Chegou atrasado"
        }
      }
    ],
    "attendanceCount": 10,
    "totalStudents": 12
  }
}
```

### POST /api/teacher/sessions/[id]/attendance

Saves attendance records for a session.

**Request Body:**
```json
{
  "attendanceRecords": [
    {
      "studentId": "uuid",
      "presente": true,
      "observacao": "Optional note"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Presenças salvas com sucesso",
  "stats": {
    "total": 12,
    "presentes": 10,
    "ausentes": 2,
    "percentual": 83
  }
}
```

### PUT /api/teacher/sessions/[id]

Updates session with relatorio (finalizes it).

**Request Body:**
```json
{
  "relatorio": "Today we covered chapter 3..."
}
```

**Response:**
```json
{
  "session": { ... },
  "message": "Sessão finalizada com sucesso"
}
```

### GET /api/admin/analytics/overview

Returns analytics overview data.

**Response:**
```json
{
  "summary": {
    "totalActiveClasses": 15,
    "totalActiveStudents": 120,
    "totalSessionsConducted": 45,
    "averageAttendanceRate": 85
  },
  "enrollmentsByGrupo": {
    "Igreja": 50,
    "Espiritualidade": 40,
    "Evangelho": 30
  },
  "enrollmentsByCity": {
    "Itu": 70,
    "Indaiatuba": 50
  },
  "enrollmentsByStatus": [
    { "status": "ativo", "count": 100 },
    { "status": "concluido", "count": 15 },
    { "status": "cancelado", "count": 5 }
  ],
  "capacityUtilization": [ ... ],
  "sessionsPerWeek": [ ... ],
  "generatedAt": "2024-01-22T19:00:00.000Z"
}
```

## Known Limitations

- Session detail page for teacher class history needs session list endpoint
- Export feature in reports page is a placeholder
- No real-time updates (uses polling every 30s)
- Charts may not display optimally on very small screens

## Next Steps (Phase 5)

1. Student self-service portal
2. Email notifications for sessions
3. Export reports to PDF/Excel
4. Real-time session updates with WebSockets
5. Bulk enrollment operations
