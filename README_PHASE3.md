# Phase 3 - Admin Class Management UI

This document describes the implementation of Phase 3 of the PG Repense system.

## Overview

Phase 3 implements:
- Class management API endpoints (CRUD operations)
- Teacher management API endpoints
- Class list, create, and edit pages
- Student management per class with transfer functionality
- Teacher list and create functionality
- Updated navigation with working links

## New Dependencies

```bash
npm install react-hot-toast @headlessui/react
```

## Files Created

### API Endpoints

| File | Method | Description |
|------|--------|-------------|
| `app/api/admin/classes/route.ts` | GET | List all classes with filters |
| `app/api/admin/classes/route.ts` | POST | Create a new class |
| `app/api/admin/classes/[id]/route.ts` | GET | Get single class details |
| `app/api/admin/classes/[id]/route.ts` | PUT | Update class (capacidade, eh_ativo) |
| `app/api/admin/classes/[id]/students/route.ts` | GET | List enrolled students |
| `app/api/admin/classes/[id]/move-student/route.ts` | POST | Transfer student to another class |
| `app/api/admin/teachers/route.ts` | GET | List all teachers |
| `app/api/admin/teachers/route.ts` | POST | Create a new teacher |
| `app/api/admin/teachers/[id]/route.ts` | GET | Get single teacher |
| `app/api/admin/teachers/[id]/route.ts` | PATCH | Toggle teacher active status |

### Pages

| File | Description |
|------|-------------|
| `app/admin/classes/page.tsx` | Class list with filters and actions |
| `app/admin/classes/[id]/edit/page.tsx` | Edit class (capacidade, status) |
| `app/admin/classes/[id]/students/page.tsx` | View enrolled students, transfer |
| `app/admin/teachers/page.tsx` | Teacher list with tabs (active/inactive) |
| `app/admin/reports/page.tsx` | Placeholder reports page |

### Components

| File | Description |
|------|-------------|
| `app/components/ToastProvider.tsx` | Toast notification provider |
| `app/components/Modal.tsx` | Reusable modal + ConfirmModal |
| `app/components/CreateClassModal.tsx` | Create class form modal |
| `app/components/CreateTeacherModal.tsx` | Create teacher form modal |
| `app/components/TransferStudentModal.tsx` | Transfer student modal |

### Updated Files

| File | Changes |
|------|---------|
| `app/components/AdminNav.tsx` | Enabled Turmas, Professores, Relatórios links |
| `app/admin/layout.tsx` | Added ToastProvider |

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

3. Login as admin at `/admin/login`

### Class Management

- [ ] Navigate to `/admin/classes`
- [ ] Verify class list loads with all columns
- [ ] Test filters: Status, Grupo, Professor
- [ ] Click "Criar Turma" button
- [ ] Fill out create class form:
  - Select a professor
  - Choose grupo (Igreja/Espiritualidade/Evangelho)
  - Choose modelo (online/presencial)
  - Set data início and horário
  - Set capacidade and número de sessões
  - Toggle checkboxes (mulheres, itu, 16h, ativo)
  - Optionally add WhatsApp link
- [ ] Submit and verify class appears in list
- [ ] Click "Editar" on a class
- [ ] Verify only capacidade and eh_ativo are editable
- [ ] Try setting capacidade below numero_inscritos (should fail)
- [ ] Save changes and verify updates

### Student Management

- [ ] Click "Alunos" on a class with enrolled students
- [ ] Verify student list shows with status badges
- [ ] Click "Mover" on an active student
- [ ] Verify only same grupo_repense classes appear
- [ ] Verify current class is not in the list
- [ ] Verify full classes are not shown
- [ ] Select a destination class
- [ ] Click "Continuar" and verify confirmation screen
- [ ] Click "Confirmar Transferência"
- [ ] Verify student moved to new class

### Teacher Management

- [ ] Navigate to `/admin/teachers`
- [ ] Verify teacher list loads with tabs
- [ ] Click "Adicionar Professor"
- [ ] Fill out form:
  - Nome: Test Professor
  - Email: test@example.com
  - Telefone: 11999999999
  - Password: senha12345
- [ ] Submit and verify teacher appears in list
- [ ] Click "Desativar" on a teacher
- [ ] Confirm deactivation
- [ ] Switch to "Inativos" tab
- [ ] Verify teacher appears there
- [ ] Click "Ativar" to reactivate

### Mobile Responsiveness

- [ ] Test class list on mobile (should show cards)
- [ ] Test student list on mobile (should show cards)
- [ ] Test teacher list on mobile (should show cards)
- [ ] Test navigation hamburger menu

### Error Handling

- [ ] Try creating class without required fields
- [ ] Try creating teacher with existing email
- [ ] Try transferring to a full class (shouldn't be selectable)
- [ ] Test with expired token (should redirect to login)

## API Documentation

### GET /api/admin/classes

**Query Parameters:**
- `eh_ativo`: boolean - filter by active status
- `teacher_id`: string - filter by teacher
- `grupo_repense`: string - filter by grupo

**Response:**
```json
{
  "classes": [
    {
      "id": "uuid",
      "grupo_repense": "Igreja",
      "modelo": "presencial",
      "capacidade": 15,
      "numero_inscritos": 10,
      "eh_ativo": true,
      "eh_16h": false,
      "eh_mulheres": false,
      "eh_itu": true,
      "horario": "Segunda 19h",
      "data_inicio": "2024-01-08T00:00:00.000Z",
      "teacher": {
        "id": "uuid",
        "nome": "Teacher Name",
        "email": "teacher@example.com"
      }
    }
  ]
}
```

### POST /api/admin/classes

**Request Body:**
```json
{
  "teacher_id": "uuid (optional)",
  "grupo_repense": "Igreja | Espiritualidade | Evangelho",
  "modelo": "online | presencial",
  "capacidade": 15,
  "eh_16h": false,
  "eh_mulheres": false,
  "eh_itu": false,
  "link_whatsapp": "https://... (optional)",
  "data_inicio": "2024-01-08 (optional)",
  "horario": "Segunda 19h (optional)",
  "numero_sessoes": 8,
  "eh_ativo": true
}
```

### PUT /api/admin/classes/[id]

**Request Body:**
```json
{
  "capacidade": 20,
  "eh_ativo": false
}
```

### POST /api/admin/classes/[id]/move-student

**Request Body:**
```json
{
  "studentId": "uuid",
  "newClassId": "uuid"
}
```

### POST /api/admin/teachers

**Request Body:**
```json
{
  "nome": "Teacher Name",
  "email": "teacher@example.com",
  "telefone": "11999999999",
  "password": "minimo8chars"
}
```

### PATCH /api/admin/teachers/[id]

Toggles `eh_ativo` status. No request body needed.

## Known Limitations

- Enrollments page not implemented yet
- Reports page is a placeholder
- Cannot edit teacher information (only toggle status)
- Cannot delete classes or teachers
- Session management not implemented

## Next Steps (Phase 4)

1. Teacher session management
2. Student check-in flow
3. Attendance reports
4. Bulk operations (batch enrollment, etc.)
