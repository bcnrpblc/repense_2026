---
name: Content Documents Feature
overview: Add a Content/Documents section where admins can upload files and teachers can view and download them. This requires a new Prisma model, file storage via the local filesystem, protected API routes for upload/listing/serving, and new pages + nav entries in both dashboards.
todos:
  - id: schema
    content: Add Document model to prisma/schema.prisma and run migration
    status: pending
  - id: api-admin
    content: "Create admin API routes: POST+GET /api/admin/documents and DELETE /api/admin/documents/[id]"
    status: pending
  - id: api-teacher
    content: "Create teacher list API route: GET /api/teacher/documents"
    status: pending
  - id: api-serve
    content: "Create authenticated file-serving route: GET /api/documents/[id]/file"
    status: pending
  - id: admin-page
    content: Create admin content management page at app/admin/content/page.tsx
    status: pending
  - id: teacher-page
    content: Create teacher content view page at app/teacher/content/page.tsx
    status: pending
  - id: nav
    content: Add 'Conteúdo' nav item to AdminNav.tsx and TeacherNav.tsx
    status: pending
isProject: false
---

# Content Documents Feature

## Architecture Overview

```mermaid
flowchart LR
  Admin -->|"POST /api/admin/documents"| Upload
  Upload -->|saves metadata| DB["PostgreSQL\n(Document model)"]
  Upload -->|saves file| FS["Server Filesystem\n(/uploads/)"]
  Teacher -->|"GET /api/teacher/documents"| List
  List -->|reads metadata| DB
  Teacher -->|"GET /api/documents/[id]/file"| Serve
  Serve -->|verifies JWT, streams file| FS
```



Files are stored on the server filesystem in an `/uploads/documents/` directory. Access to the actual file bytes is gated behind an authenticated API route — files are never served directly from `public/`. This can be swapped to S3/Cloudflare R2 later by changing only the storage layer.

---

## 1. Database — `prisma/schema.prisma`

Add a new `Document` model:

```prisma
model Document {
  id           String   @id @default(uuid())
  nome         String
  descricao    String?
  filename     String
  mimetype     String
  size_bytes   Int
  uploaded_by  String
  criado_em    DateTime @default(now())

  @@map("documents")
}
```

Then run `prisma migrate dev --name add_documents`.

---

## 2. API Routes

- `[app/api/admin/documents/route.ts](app/api/admin/documents/route.ts)`
  - `POST` — multipart upload, saves file to `/uploads/documents/`, inserts `Document` row. Protected by `verifyAdminToken()`.
  - `GET` — lists all documents. Protected by `verifyAdminToken()`.
- `[app/api/admin/documents/[id]/route.ts](app/api/admin/documents/[id]/route.ts)`
  - `DELETE` — deletes DB row + filesystem file. Protected by `verifyAdminToken()`.
- `[app/api/teacher/documents/route.ts](app/api/teacher/documents/route.ts)`
  - `GET` — lists all published documents. Protected by `verifyTeacherToken()`.
- `[app/api/documents/[id]/file/route.ts](app/api/documents/[id]/file/route.ts)`
  - `GET` — validates admin OR teacher JWT, then streams the file with proper `Content-Disposition` headers. This is how both dashboards download files.

File upload will use the native `Request.formData()` API (built into Next.js App Router) and Node's `fs` module to write to disk.

---

## 3. Admin Content Page — `app/admin/content/page.tsx`

- Upload form: file picker + name field + optional description
- Document list table with: name, description, size, upload date, download link, delete button
- Uses `Card` and `Button` from existing `@/app/components/ui`
- Pattern matches `[app/admin/reports/page.tsx](app/admin/reports/page.tsx)`

---

## 4. Teacher Content Page — `app/teacher/content/page.tsx`

- Read-only list of documents with name, description, and a download button per item
- Download opens `GET /api/documents/[id]/file` with auth token
- Pattern matches `[app/teacher/dashboard/page.tsx](app/teacher/dashboard/page.tsx)`

---

## 5. Navigation Updates

- `[app/components/AdminNav.tsx](app/components/AdminNav.tsx)` — add `{ label: 'Conteúdo', href: '/admin/content', icon: <DocumentIcon /> }` to `baseNavItems`
- `[app/components/TeacherNav.tsx](app/components/TeacherNav.tsx)` — add `{ label: 'Conteúdo', href: '/teacher/content', icon: <DocumentIcon /> }` to `navItems`

