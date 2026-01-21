import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createTeacherSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefone: z.string().min(10, 'Telefone inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

// ============================================================================
// GET /api/admin/teachers
// ============================================================================

/**
 * Get all teachers
 * 
 * Query params:
 * - inactive_only: boolean - filter only inactive teachers
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAdminToken(request);

    const { searchParams } = new URL(request.url);
    const inactiveOnly = searchParams.get('inactive_only') === 'true';

    const where: any = {};
    if (inactiveOnly) {
      where.eh_ativo = false;
    }

    const teachers = await prisma.teacher.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        eh_ativo: true,
        criado_em: true,
        _count: {
          select: {
            Class: true,
          },
        },
      },
      orderBy: [
        { eh_ativo: 'desc' }, // Active first
        { nome: 'asc' },
      ],
    });

    // Transform response
    const response = teachers.map((t) => ({
      id: t.id,
      nome: t.nome,
      email: t.email,
      telefone: t.telefone,
      eh_ativo: t.eh_ativo,
      criado_em: t.criado_em,
      classCount: t._count.Class,
    }));

    return NextResponse.json({ teachers: response });

  } catch (error) {
    console.error('Error fetching teachers:', error);

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
// POST /api/admin/teachers
// ============================================================================

/**
 * Create a new teacher
 */
export async function POST(request: NextRequest) {
  try {
    await verifyAdminToken(request);

    const body = await request.json();
    const data = createTeacherSchema.parse(body);

    // Check if email is already in use
    const existing = await prisma.teacher.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email já está em uso' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create teacher
    const teacher = await prisma.teacher.create({
      data: {
        id: randomUUID(),
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        password_hash: passwordHash,
        eh_ativo: true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        eh_ativo: true,
        criado_em: true,
      },
    });

    return NextResponse.json({ teacher }, { status: 201 });

  } catch (error) {
    console.error('Error creating teacher:', error);

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
