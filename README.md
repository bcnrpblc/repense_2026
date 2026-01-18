# PG Repense - Sistema de Matrícula de Cursos

Sistema de matrícula para cursos PG Repense construído com Next.js 14, Prisma e PostgreSQL.

## Estrutura do Projeto

```
repense_2026/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Layout raiz
│   ├── page.tsx           # Página inicial
│   └── globals.css        # Estilos globais (TailwindCSS)
├── lib/
│   └── prisma.ts          # Prisma Client singleton
├── prisma/
│   └── schema.prisma      # Schema do banco de dados
├── .env.example           # Exemplo de variáveis de ambiente
├── .gitignore
├── next.config.js         # Configuração do Next.js
├── package.json
├── postcss.config.js      # Configuração do PostCSS
├── tailwind.config.ts     # Configuração do TailwindCSS
└── tsconfig.json          # Configuração do TypeScript
```

## Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure suas variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure a `DATABASE_URL`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/repense_db?schema=public"
```

### 3. Gerar Prisma Client

```bash
npm run db:generate
```

Este comando gera o Prisma Client com tipos TypeScript baseados no schema.

### 4. Criar Migração Inicial

```bash
npm run db:migrate
```

Este comando:
- Cria a migração inicial baseada no schema
- Aplica a migração ao banco de dados
- Regenera o Prisma Client

**Nota:** Você será solicitado a dar um nome à migração (por exemplo: `init`).

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run start` - Inicia o servidor de produção
- `npm run lint` - Executa o linter
- `npm run db:generate` - Gera o Prisma Client
- `npm run db:migrate` - Cria e aplica migrações
- `npm run db:studio` - Abre o Prisma Studio (interface visual do banco)
- `npm run db:push` - Faz push do schema para o banco (sem migrações)

## Modelos do Banco de Dados

### Student
- Informações pessoais dos estudantes
- Campos únicos: `cpf`, `telefone`, `email`
- Índices em `cpf` e `telefone` para buscas rápidas

### Course
- Informações sobre os cursos
- Enum `GrupoRepense`: Igreja, Espiritualidade, Evangelho
- Enum `ModeloCurso`: online, presencial

### Enrollment
- Relacionamento entre Student e Course (many-to-many)
- Constraint único em `[student_id, course_id]` para prevenir duplicatas
- Campo `status_pagamento` para rastrear pagamentos

### Admin
- Autenticação de administradores
- Email único e hash de senha

## Uso do Prisma Client

O Prisma Client está configurado como singleton em `lib/prisma.ts` para evitar múltiplas instâncias no desenvolvimento Next.js:

```typescript
import { prisma } from '@/lib/prisma'

// Exemplo de uso em uma API route ou Server Component
const students = await prisma.student.findMany()
```

## Próximos Passos

1. Configure seu banco de dados PostgreSQL
2. Execute as migrações: `npm run db:migrate`
3. Inicie o servidor de desenvolvimento: `npm run dev`
4. Acesse `http://localhost:3000`
