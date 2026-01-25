import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { syncTeachersActiveStatus } from '@/lib/teacherStatus';
import { isValidCity } from '@/lib/constants';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createClassSchema = z.object({
  teacher_id: z.preprocess(
    (val) => {
      // Empty strings should never exist - convert to null (which is acceptable since teacher_id is optional)
      if (val === '' || val === null || val === undefined) {
        return null;
      }
      // If a value is provided, accept any non-empty string (Prisma will validate the teacher exists)
      // Note: Seed teachers use non-UUID IDs like "teacher-seed-...", so we can't enforce UUID format
      return val;
    },
    z.union([
      z.string().min(1), // Any non-empty string (not just UUIDs, since seed data uses custom IDs)
      z.null()
    ]).optional()
  ),
  grupo_repense: z.enum(['Igreja', 'Espiritualidade', 'Evangelho']),
  modelo: z.enum(['online', 'presencial']),
  capacidade: z.number().int().min(1).max(100),
  eh_16h: z.boolean().default(false),
  eh_mulheres: z.boolean().default(false),
  cidade: z.enum(['Indaiatuba', 'Itu']),
  link_whatsapp: z.string().url().optional().nullable(),
  data_inicio: z.string().optional().nullable(), // ISO date string
  horario: z.string().optional().nullable(),
  numero_sessoes: z.number().int().min(1).max(20).default(8),
  eh_ativo: z.boolean().default(true),
});

// ============================================================================
// GET /api/admin/classes
// ============================================================================

/**
 * Get all classes with teacher info and enrollment count
 * 
 * Query params:
 * - eh_ativo: boolean - filter by active status
 * - teacher_id: string - filter by teacher
 * - grupo_repense: string - filter by grupo
 * - arquivada: boolean - filter by archived status (default: false)
 * - aguardando_inicio: boolean - filter classes waiting for start (data_inicio > today)
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdminToken(request);

    const { searchParams } = new URL(request.url);
    const ehAtivoParam = searchParams.get('eh_ativo');
    const teacherId = searchParams.get('teacher_id');
    const grupoRepense = searchParams.get('grupo_repense');
    const arquivadaParam = searchParams.get('arquivada');
    const aguardandoInicioParam = searchParams.get('aguardando_inicio');

    // Build where clause
    const where: any = {};

    // By default, don't show archived classes unless explicitly requested.
    // Important: some older rows might have NULL in "arquivada" if the column
    // was added manually. We treat NULL as "not archived".
    if (arquivadaParam === 'true') {
      where.arquivada = true;
    } else if (arquivadaParam === 'false' || arquivadaParam === null) {
      // Include both false and null (null means not archived for existing rows)
      // Using "not true" which in PostgreSQL includes both false and null
      where.arquivada = { not: true };
    }
    // If arquivadaParam === 'all', don't add any arquivada filter

    if (ehAtivoParam !== null) {
      where.eh_ativo = ehAtivoParam === 'true';
    }

    if (teacherId) {
      where.teacher_id = teacherId;
    }

    if (grupoRepense && ['Igreja', 'Espiritualidade', 'Evangelho'].includes(grupoRepense)) {
      where.grupo_repense = grupoRepense;
    }

    // Filter classes waiting for start
    if (aguardandoInicioParam === 'true') {
      where.data_inicio = {
        gt: new Date(),
      };
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        Teacher: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: 'ativo' },
            },
          },
        },
      },
      orderBy: {
        data_inicio: 'desc',
      },
    });

    // Transform response
    const response = classes.map((c) => ({
      id: c.id,
      notion_id: c.notion_id,
      grupo_repense: c.grupo_repense,
      modelo: c.modelo,
      capacidade: c.capacidade,
      numero_inscritos: c.numero_inscritos,
      eh_ativo: c.eh_ativo,
      eh_16h: c.eh_16h,
      eh_mulheres: c.eh_mulheres,
      cidade: c.cidade,
      link_whatsapp: c.link_whatsapp,
      data_inicio: c.data_inicio,
      horario: c.horario,
      numero_sessoes: c.numero_sessoes,
      atualizado_em: c.atualizado_em,
      arquivada: c.arquivada,
      teacher: c.Teacher,
      activeEnrollments: c._count.enrollments,
    }));

    return NextResponse.json({ classes: response });

  } catch (error) {
    console.error('Error fetching classes:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/admin/classes
// ============================================================================

/**
 * Create a new class
 */
export async function POST(request: NextRequest) {
  try {
    await verifyAdminToken(request);

    const body = await request.json();
    const data = createClassSchema.parse(body);

    // Validate teacher exists if provided
    if (data.teacher_id) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: data.teacher_id },
        select: { id: true, eh_ativo: true },
      });
      if (!teacher) {
        return NextResponse.json(
          { error: 'Facilitador não encontrado' },
          { status: 400 }
        );
      }
      if (!teacher.eh_ativo) {
        return NextResponse.json(
          { error: 'Facilitador está inativo' },
          { status: 400 }
        );
      }

      // Regra: Facilitador pode ter no máximo 1 grupo ativo (eh_ativo = true, arquivada = false).
      // Só validamos essa regra se a nova grupo for criada como ativa.
      if (data.eh_ativo) {
        const activeClassCount = await prisma.class.count({
          where: {
            teacher_id: data.teacher_id,
            eh_ativo: true,
            arquivada: false,
          },
        });

        if (activeClassCount >= 1) {
          return NextResponse.json(
            { error: 'Facilitador já tem 1 grupo ativo' },
            { status: 400 }
          );
        }
      }
    }

    // Validate link_whatsapp uniqueness if provided
    if (data.link_whatsapp) {
      const existingLink = await prisma.class.findFirst({
        where: {
          link_whatsapp: data.link_whatsapp,
        },
        select: { id: true, grupo_repense: true, horario: true },
      });

      if (existingLink) {
        return NextResponse.json(
          { error: 'Link WhatsApp já usado em outro grupo' },
          { status: 400 }
        );
      }
    }

    // Generate UUID for notion_id
    const notionId = randomUUID();

    // Create grupo
    const newClass = await prisma.class.create({
      data: {
        id: randomUUID(),
        notion_id: notionId,
        grupo_repense: data.grupo_repense,
        modelo: data.modelo,
        capacidade: data.capacidade,
        numero_inscritos: 0,
        eh_ativo: data.eh_ativo,
        eh_16h: data.eh_16h,
        eh_mulheres: data.eh_mulheres,
        cidade: data.cidade,
        link_whatsapp: data.link_whatsapp || null,
        data_inicio: data.data_inicio ? new Date(data.data_inicio) : null,
        horario: data.horario || null,
        numero_sessoes: data.numero_sessoes,
        teacher_id: data.teacher_id || null,
      },
      include: {
        Teacher: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    // Opcional: após criar grupo podemos sincronizar status dos líderes,
    // mas como a regra principal é usada em updates/arquivamentos, mantemos simples aqui.

    return NextResponse.json({ class: newClass }, { status: 201 });

  } catch (error) {
    console.error('Error creating class:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
