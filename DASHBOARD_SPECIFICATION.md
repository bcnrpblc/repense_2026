# Dashboard Technical Specification

## Overview
Technical specification for the PG Repense Admin Dashboard. The dashboard enables administrators to manage courses, students, enrollments, and view real-time analytics.

## Base URL
All API endpoints are relative to `/api` (e.g., `/api/courses`)

## Authentication
**Status:** Admin authentication system exists in database (`Admin` model) but API endpoints need implementation.

**Required for:** All dashboard endpoints (except public course listing)

**Implementation Notes:**
- Admin model has: `id`, `email` (unique), `password_hash`, `criado_em`
- Recommend implementing JWT or session-based auth
- Auth endpoint: `POST /api/auth/login` (to be created)

---

## Data Models

### Course
```typescript
{
  id: string (UUID)
  notion_id: string (unique)
  grupo_repense: "Igreja" | "Espiritualidade" | "Evangelho"
  modelo: "online" | "presencial"
  capacidade: number
  numero_inscritos: number
  eh_ativo: boolean
  eh_16h: boolean (afternoon courses)
  eh_mulheres: boolean (women-only)
  eh_itu: boolean (city: true=Itu, false=Indaiatuba)
  link: string | null
  data_inicio: DateTime | null
  horario: string | null (format: "HH:mm")
}
```

### Student
```typescript
{
  id: string (UUID)
  nome: string
  cpf: string (unique, cleaned format)
  telefone: string (unique, cleaned format)
  email: string | null (unique if provided)
  genero: string | null
  estado_civil: string | null
  nascimento: DateTime | null
  criado_em: DateTime
}
```

### Enrollment
```typescript
{
  id: string (UUID)
  student_id: string
  course_id: string
  criado_em: DateTime
  student: Student (relation)
  course: Course (relation)
}
```

---

## API Endpoints

### Courses Management

#### List Courses (GET `/api/courses`)
**Status:** ✅ Exists (public)

**Query Params:**
- `student_id` (optional): Filter out courses student is enrolled in
- `genero` (optional): "Masculino" | "Feminino" - filters women-only courses for males

**Response:** Grouped by city and `grupo_repense`
```json
{
  "indaiatuba": {
    "Igreja": [...courses],
    "Espiritualidade": [...courses],
    "Evangelho": [...courses]
  },
  "itu": {
    "Igreja": [...courses],
    "Espiritualidade": [...courses],
    "Evangelho": [...courses]
  }
}
```

#### Create Course (POST `/api/courses`)
**Status:** ❌ Needs implementation

**Request Body:**
```json
{
  "notion_id": "string (required, unique)",
  "grupo_repense": "Igreja" | "Espiritualidade" | "Evangelho",
  "modelo": "online" | "presencial",
  "capacidade": number,
  "eh_ativo": boolean,
  "eh_16h": boolean (default: false),
  "eh_mulheres": boolean (default: false),
  "eh_itu": boolean (default: false),
  "link": "string | null",
  "data_inicio": "ISO date string | null",
  "horario": "HH:mm | null"
}
```

**Response:** `201 Created` with course object

#### Update Course (PUT `/api/courses/[id]`)
**Status:** ❌ Needs implementation

**Request Body:** Same as Create (all fields optional except validation)

**Response:** `200 OK` with updated course object

#### Delete Course (DELETE `/api/courses/[id]`)
**Status:** ❌ Needs implementation

**Behavior:** Cascade deletes enrollments (handled by Prisma)
**Response:** `204 No Content`

#### Get Course Details (GET `/api/courses/[id]`)
**Status:** ❌ Needs implementation

**Response:** Course object with enrollment count and list

---

### Students Management

#### List Students (GET `/api/students`)
**Status:** ❌ Needs implementation

**Query Params:**
- `search` (optional): Search by nome, cpf, email
- `page` (optional): Pagination page number
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "students": [...],
  "total": number,
  "page": number,
  "limit": number
}
```

#### Get Student (GET `/api/students/[id]`)
**Status:** ✅ Exists

**Response:** Student with `completed_courses` array

#### Update Student (PUT `/api/students/[id]`)
**Status:** ❌ Needs implementation

**Request Body:**
```json
{
  "nome"?: string,
  "email"?: string | null,
  "telefone"?: string,
  "genero"?: string | null,
  "estado_civil"?: string | null,
  "nascimento"?: "ISO date string | null"
}
```

**Validation:** CPF cannot be changed (unique constraint)

---

### Enrollments Management

#### List Enrollments (GET `/api/enrollments`)
**Status:** ❌ Needs implementation

**Query Params:**
- `course_id` (optional): Filter by course
- `student_id` (optional): Filter by student
- `date_from` (optional): Filter from date (ISO)
- `date_to` (optional): Filter to date (ISO)
- `page` (optional): Pagination
- `limit` (optional): Items per page

**Response:**
```json
{
  "enrollments": [{
    "id": string,
    "criado_em": "ISO date",
    "student": { "id", "nome", "cpf", "email", "telefone" },
    "course": { "id", "grupo_repense", "modelo", "data_inicio", "horario" }
  }],
  "total": number
}
```

#### Get Enrollment (GET `/api/enrollments/[id]`)
**Status:** ✅ Exists

**Response:** Enrollment with student and course details

#### Delete Enrollment (DELETE `/api/enrollments/[id]`)
**Status:** ❌ Needs implementation

**Behavior:** Decrements `course.numero_inscritos`
**Response:** `204 No Content`

---

### Analytics & Reports

#### Dashboard Statistics (GET `/api/analytics/dashboard`)
**Status:** ❌ Needs implementation

**Response:**
```json
{
  "total_students": number,
  "total_courses": number,
  "total_enrollments": number,
  "active_courses": number,
  "enrollments_today": number,
  "enrollments_this_week": number,
  "courses_by_grupo": {
    "Igreja": number,
    "Espiritualidade": number,
    "Evangelho": number
  },
  "enrollments_by_city": {
    "indaiatuba": number,
    "itu": number
  }
}
```

#### Course Analytics (GET `/api/analytics/courses/[id]`)
**Status:** ❌ Needs implementation

**Response:**
```json
{
  "course": {...course object},
  "enrollment_count": number,
  "capacity_utilization": number (percentage),
  "enrollments_by_date": [{ "date": "YYYY-MM-DD", "count": number }],
  "recent_enrollments": [...enrollment objects]
}
```

#### Enrollment Trends (GET `/api/analytics/enrollments/trends`)
**Status:** ❌ Needs implementation

**Query Params:**
- `period`: "day" | "week" | "month" (default: "week")
- `date_from`: ISO date string
- `date_to`: ISO date string

**Response:**
```json
{
  "period": string,
  "data": [{ "date": "YYYY-MM-DD", "count": number }]
}
```

---

## Real-time Data

### Recommended Implementation

**Option 1: Polling**
- Refresh dashboard stats every 30-60 seconds
- Use React Query or SWR for automatic refetching

**Option 2: Server-Sent Events (SSE)**
- Endpoint: `GET /api/analytics/stream`
- Stream updates when enrollments change

**Option 3: WebSocket** (if needed for live collaboration)

---

## Validation Rules

### Course
- `notion_id`: Required, unique
- `capacidade`: Positive integer
- `horario`: Format "HH:mm" if provided
- `data_inicio`: Valid ISO date if provided

### Student
- `cpf`: Required, unique, validated format (see `/lib/utils/cpf.ts`)
- `telefone`: Required, unique, cleaned format (see `/lib/utils/phone.ts`)
- `email`: Optional, must be valid email format if provided

### Enrollment
- Unique constraint: `student_id + course_id`
- Course must be active
- Course capacity must not be exceeded

---

## Error Handling

All endpoints return consistent error format:
```json
{
  "error": "Error message",
  "validation_errors"?: { "field": "message" }
}
```

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `204`: No Content (delete success)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (auth required)
- `404`: Not Found
- `409`: Conflict (duplicate/constraint violation)
- `500`: Internal Server Error

---

## Dashboard Features Summary

1. **Course Management**
   - View all courses (filterable by grupo, city, active status)
   - Create new courses
   - Edit course details (capacity, dates, links, active status)
   - Delete courses (with confirmation)
   - View course enrollment list

2. **Student Management**
   - Search students (by name, CPF, email)
   - View student details and enrollment history
   - Edit student information
   - View all enrollments per student

3. **Enrollment Management**
   - View all enrollments (with filters)
   - Remove enrollments
   - Export enrollment data (CSV/Excel recommended)

4. **Analytics Dashboard**
   - Real-time enrollment statistics
   - Course capacity utilization charts
   - Enrollment trends over time
   - City and grupo distribution
   - Daily/weekly enrollment counts

5. **Real-time Updates**
   - Auto-refresh statistics
   - Notification for new enrollments (optional)
   - Live enrollment count updates

---

## Technical Stack (Current)

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL with Prisma ORM
- **Styling:** TailwindCSS
- **Validation:** Zod

## Recommendations for Dashboard

- **State Management:** React Query or SWR for API data
- **Charts:** Recharts or Chart.js for analytics visualization
- **Table/Grid:** TanStack Table (React Table) for sortable/filterable tables
- **Forms:** React Hook Form (already used in project)
- **Date Handling:** date-fns or dayjs

---

## Notes

- All dates are returned in ISO 8601 format
- CPF and phone numbers are stored in cleaned format (no special characters)
- Course `numero_inscritos` is automatically managed (incremented/decremented on enrollment creation/deletion)
- Database uses cascade deletes: deleting a course deletes all enrollments
- Sync endpoint exists (`POST /api/sync/courses`) for bulk course updates from external source (Notion)
