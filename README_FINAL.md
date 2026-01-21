# PG Repense - Sistema de Gestão de Cursos

Sistema completo de gestão de cursos para o PG Repense, incluindo gestão de turmas, professores, alunos e inscrições.

## Visão Geral

O sistema é uma aplicação Next.js 14 (App Router) com:
- **Frontend**: React 18, TailwindCSS, Headless UI
- **Backend**: Next.js API Routes
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticação**: JWT (JSON Web Tokens)

## Funcionalidades

### Área Administrativa (`/admin`)
- **Dashboard**: Visão geral com estatísticas de turmas, alunos e professores
- **Turmas**: CRUD de turmas, gerenciamento de capacidade, status ativo/inativo
- **Alunos**: Listagem, busca, perfil completo, histórico de inscrições
- **Professores**: Cadastro e gerenciamento de professores
- **Relatórios**: Exportação de dados e relatórios

### Área do Professor (`/teacher`)
- **Dashboard**: Visão das turmas atribuídas
- **Turmas**: Lista de turmas com alunos
- **Sessões**: Criação de sessões e registro de frequência

### Sistema de Inscrições
- Validação de regras de negócio
- Prevenção de inscrições duplicadas
- Transferência entre turmas
- Conclusão e cancelamento de inscrições

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

## Setup do Ambiente

### 1. Clone o repositório

```bash
git clone <repository-url>
cd repense_2026
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Configure as variáveis:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/repense"

# JWT (IMPORTANTE: Use uma chave forte em produção!)
JWT_SECRET="sua-chave-secreta-32-caracteres-min"

# Ambiente
NODE_ENV=development
```

### 4. Configure o banco de dados

```bash
# Gere o cliente Prisma
npx prisma generate

# Execute as migrações
npx prisma migrate deploy

# (Opcional) Popule com dados de teste
npx prisma db seed
```

### 5. Inicie o servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | URL de conexão PostgreSQL | Sim |
| `JWT_SECRET` | Chave secreta para tokens JWT (32+ chars) | Sim |
| `NODE_ENV` | Ambiente (`development`, `production`) | Não |

## Estrutura do Projeto

```
repense_2026/
├── app/
│   ├── admin/              # Páginas administrativas
│   │   ├── classes/        # Gerenciamento de turmas
│   │   ├── students/       # Gerenciamento de alunos
│   │   ├── teachers/       # Gerenciamento de professores
│   │   └── dashboard/      # Dashboard admin
│   ├── teacher/            # Área do professor
│   │   ├── classes/        # Turmas do professor
│   │   └── dashboard/      # Dashboard professor
│   ├── api/                # API Routes
│   │   ├── admin/          # Endpoints administrativos
│   │   ├── auth/           # Autenticação
│   │   ├── enrollment/     # Validação de inscrições
│   │   └── teacher/        # Endpoints do professor
│   └── components/         # Componentes React
├── lib/                    # Utilitários
│   ├── auth.ts            # Autenticação JWT
│   ├── enrollment.ts      # Lógica de inscrições
│   ├── prisma.ts          # Cliente Prisma
│   └── rateLimit.ts       # Rate limiting
├── prisma/
│   ├── schema.prisma      # Schema do banco
│   └── seed.ts            # Dados iniciais
└── public/                 # Arquivos estáticos
```

## Papéis e Permissões

### Administrador
- Acesso total ao sistema
- Criar/editar/desativar turmas e professores
- Gerenciar inscrições de alunos
- Visualizar todos os relatórios

### Professor
- Visualizar turmas atribuídas
- Criar sessões de aula
- Registrar frequência dos alunos
- Visualizar lista de alunos

## API Reference

### Autenticação

Todos os endpoints protegidos requerem o header:
```
Authorization: Bearer <token>
```

### Admin Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/classes` | Lista turmas |
| POST | `/api/admin/classes` | Cria turma |
| PUT | `/api/admin/classes/[id]` | Atualiza turma |
| GET | `/api/admin/classes/[id]/students` | Alunos da turma |
| GET | `/api/admin/students` | Lista alunos (paginado) |
| GET | `/api/admin/students/[id]` | Detalhes do aluno |
| PUT | `/api/admin/students/[id]` | Atualiza aluno |
| POST | `/api/admin/enrollments/[id]/complete` | Conclui inscrição |
| POST | `/api/admin/enrollments/[id]/cancel` | Cancela inscrição |
| GET | `/api/admin/teachers` | Lista professores |

### Teacher Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/teacher/classes` | Turmas do professor |
| GET | `/api/teacher/sessions` | Sessões |
| POST | `/api/teacher/sessions` | Cria sessão |
| POST | `/api/teacher/sessions/[id]/attendance` | Registra frequência |

### Public Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/enrollment/validate` | Valida inscrição |
| POST | `/api/auth/admin/login` | Login admin |
| POST | `/api/auth/teacher/login` | Login professor |

## Status de Inscrição

- **ativo**: Inscrição em andamento
- **concluido**: Curso finalizado com sucesso
- **cancelado**: Inscrição cancelada
- **transferido**: Transferido para outra turma

## Grupos Repense

O sistema possui três grupos de cursos:
- **Igreja**: Primeiro módulo
- **Espiritualidade**: Segundo módulo
- **Evangelho**: Terceiro módulo

Regras:
- Um aluno só pode ter UMA inscrição ativa por grupo
- Não é possível se reinscrever em um curso já concluído
- Cancelamentos permitem reinscrição com confirmação

## Troubleshooting

### Erro de conexão com banco de dados
1. Verifique se o PostgreSQL está rodando
2. Confirme a `DATABASE_URL` no `.env`
3. Execute `npx prisma db push` para sincronizar

### Erro de autenticação (401)
1. Verifique se o token está no header
2. Confirme que o `JWT_SECRET` está configurado
3. Tokens expiram em 7 dias

### Erro de validação (400)
1. Verifique o formato dos dados enviados
2. Consulte os logs do servidor para detalhes

### Erro de rate limiting (429)
1. Aguarde 1 minuto antes de tentar novamente
2. Endpoints de auth: máximo 10 req/min
3. Outros endpoints: máximo 100 req/min

## Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm start            # Servidor de produção
npm run lint         # Verificação de lint
npx prisma studio    # Interface visual do banco
npx prisma migrate   # Executar migrações
```

## Contato

Para dúvidas ou suporte técnico, entre em contato com a equipe de desenvolvimento.
