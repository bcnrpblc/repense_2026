import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/teacher/conversations/[id]
// ============================================================================
// Get one conversation; ensure current teacher is the class's teacher_id.

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenPayload = await verifyTeacherToken(request);
    const teacherId = tokenPayload.teacherId;
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
            teacher_id: true,
            CoLeaders: {
              where: { id: teacherId },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!conversation?.Class) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      );
    }

    const classData = conversation.Class!;
    const isTeacher = classData.teacher_id === teacherId;
    const isCoLeader = ((classData as { CoLeaders?: { id: string }[] }).CoLeaders?.length ?? 0) > 0;
    if (!isTeacher && !isCoLeader) {
      return NextResponse.json(
        { error: 'Você não tem acesso a esta conversa' },
        { status: 403 }
      );
    }

    const { teacher_id: _tid, ...classWithoutTeacherId } = classData;
    return NextResponse.json({
      conversation: {
        ...conversation,
        Class: classWithoutTeacherId,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/teacher/conversations/[id]:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao buscar conversa' },
      { status: 500 }
    );
  }
}
