import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/students/[id]
// ============================================================================

/**
 * Get student by ID (public endpoint for success pages)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        nome: true,
        cpf: true,
        email: true,
        telefone: true,
        genero: true,
        estado_civil: true,
        nascimento: true,
        criado_em: true,
        priority_list: true,
        priority_list_course_id: true,
        priority_list_added_at: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Estudante não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
