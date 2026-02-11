import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/admin/classes/[id]/conversations
// ============================================================================
// List conversations for this class (class-level + any participant-level).
// Query ?studentId= optional to get or create one thread for that student.

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAdminToken(request);
    const classId = params.id;
    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get('studentId');

    const classExists = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true },
    });
    if (!classExists) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      );
    }

    // No studentId query: list all conversations for this class
    if (studentIdParam === null) {
      const conversations = await prisma.conversation.findMany({
        where: { class_id: classId },
        include: {
          Student: {
            select: { id: true, nome: true },
          },
          _count: {
            select: { Message: true },
          },
          Message: {
            orderBy: { criado_em: 'desc' },
            take: 1,
            select: {
              body: true,
              criado_em: true,
              sender_type: true,
            },
          },
        },
        orderBy: { criado_em: 'desc' },
      });
      return NextResponse.json({ conversations });
    }

    // studentId query present: get or create single thread (class-level if empty, else participant-level)
    const studentIdOrNull = studentIdParam === '' ? null : studentIdParam;

    let conversation = await prisma.conversation.findFirst({
      where: {
        class_id: classId,
        student_id: studentIdOrNull,
      },
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
      conversation = await prisma.conversation.create({
        data: {
          class_id: classId,
          student_id: studentIdOrNull,
        },
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
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error in GET /api/admin/classes/[id]/conversations:', error);
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro ao listar conversas' },
      { status: 500 }
    );
  }
}
