import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const enrollmentId = params.id;

    // Fetch enrollment with student and course data
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            cpf: true,
          },
        },
        course: {
          select: {
            id: true,
            grupo_repense: true,
            modelo: true,
            link: true,
            data_inicio: true,
            horario: true,
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'inscrição não encontrada' },
        { status: 404 }
      );
    }

    // Format response
    const response = {
      id: enrollment.id,
      student: {
        id: enrollment.student.id,
        nome: enrollment.student.nome,
        email: enrollment.student.email,
        telefone: enrollment.student.telefone,
        cpf: enrollment.student.cpf,
      },
      course: {
        id: enrollment.course.id,
        grupo_repense: enrollment.course.grupo_repense,
        modelo: enrollment.course.modelo,
        link: enrollment.course.link,
        data_inicio: enrollment.course.data_inicio ? enrollment.course.data_inicio.toISOString() : null,
        horario: enrollment.course.horario,
      },
      criado_em: enrollment.criado_em,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados da inscrição' },
      { status: 500 }
    );
  }
}
