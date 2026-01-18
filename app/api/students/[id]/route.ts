import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;

    // Fetch student with enrollments and courses
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                grupo_repense: true,
                modelo: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Estudante não encontrado' },
        { status: 404 }
      );
    }

    // Format response
    const response = {
      id: student.id,
      nome: student.nome,
      cpf: student.cpf,
      telefone: student.telefone,
      email: student.email,
      genero: student.genero,
      estado_civil: student.estado_civil,
      nascimento: student.nascimento,
      completed_courses: student.enrollments.map((enrollment) => ({
        id: enrollment.course.id,
        grupo_repense: enrollment.course.grupo_repense,
        modelo: enrollment.course.modelo,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados do estudante' },
      { status: 500 }
    );
  }
}
