import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrTeacherAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/admin/conversations/[id]
// ============================================================================
// Get conversation with class/student info. Admin can access any conversation.

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminOrTeacherAdminToken(request);
    const id = params.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        Student: { select: { id: true, nome: true } },
        Class: {
          select: {
            id: true,
            grupo_repense: true,
            horario: true,
            Teacher: {
              select: { id: true, nome: true, email: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error in GET /api/admin/conversations/[id]:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao buscar conversa' },
      { status: 500 }
    );
  }
}
