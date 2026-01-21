import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/courses/[id]
// ============================================================================

/**
 * Get course/class by ID (public endpoint for success pages)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;

    const course = await prisma.class.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        grupo_repense: true,
        modelo: true,
        horario: true,
        data_inicio: true,
        capacidade: true,
        numero_inscritos: true,
        eh_ativo: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
