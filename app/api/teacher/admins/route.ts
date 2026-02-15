import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/teacher/admins
// ============================================================================
// Returns list of admins for dropdown (teacher can start conversation with any admin).

export async function GET(request: NextRequest) {
  try {
    await verifyTeacherToken(request);

    const admins = await prisma.admin.findMany({
      orderBy: { email: 'asc' },
      select: {
        id: true,
        email: true,
      },
    });

    const list = admins.map((a) => ({
      id: a.id,
      name: a.email,
    }));

    return NextResponse.json({ admins: list });
  } catch (error) {
    console.error('Error in GET /api/teacher/admins:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao carregar líderes' },
      { status: 500 }
    );
  }
}
