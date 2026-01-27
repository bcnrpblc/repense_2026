import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/superadmin/users
 *
 * List admins and teachers for password management.
 * Requires superadmin privileges.
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperadmin(request);

    const [admins, teachers] = await Promise.all([
      prisma.admin.findMany({
        select: { id: true, email: true, role: true, criado_em: true },
      }),
      prisma.teacher.findMany({
        select: {
          id: true,
          nome: true,
          email: true,
          eh_ativo: true,
          criado_em: true,
        },
      }),
    ]);

    return NextResponse.json({
      admins: admins.map((a) => ({ ...a, type: 'admin' as const })),
      teachers: teachers.map((t) => ({ ...t, type: 'teacher' as const })),
    });
  } catch (error) {
    console.error('Error fetching superadmin users:', error);

    return NextResponse.json(
      { error: 'Erro ao carregar usuários' },
      { status: 500 }
    );
  }
}

