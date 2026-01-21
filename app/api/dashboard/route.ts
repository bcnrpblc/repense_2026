import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GrupoRepense, ModeloCurso } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get total registrations count
    const totalRegistrations = await prisma.enrollment.count();

    // Get all enrollments with course data for grouping
    const enrollments = await prisma.enrollment.findMany({
      include: {
        Class: true,
      },
    });

    // Group by repense type
    const byRepense: { Igreja: number; Espiritualidade: number; Evangelho: number } = {
      Igreja: 0,
      Espiritualidade: 0,
      Evangelho: 0,
    };

    // Group by city
    const byCity: { Indaiatuba: number; Itu: number } = {
      Indaiatuba: 0,
      Itu: 0,
    };

    enrollments.forEach((enrollment) => {
      // Count by repense type
      const repenseType = enrollment.Class.grupo_repense;
      byRepense[repenseType] = (byRepense[repenseType] || 0) + 1;

      // Count by city
      if (enrollment.Class.eh_itu) {
        byCity.Itu += 1;
      } else {
        byCity.Indaiatuba += 1;
      }
    });

    // Get top 5 courses by enrollment (numero_inscritos)
    const topCourses = await prisma.class.findMany({
      where: {
        eh_ativo: true,
      },
      orderBy: {
        numero_inscritos: 'desc',
      },
      take: 5,
      select: {
        notion_id: true,
        grupo_repense: true,
        modelo: true,
        data_inicio: true,
        horario: true,
        numero_inscritos: true,
        capacidade: true,
        eh_itu: true,
      },
    });

    // Format top courses for response
    const topCoursesFormatted = topCourses.map((course) => ({
      notion_id: course.notion_id,
      grupo_repense: course.grupo_repense,
      modelo: course.modelo,
      data_inicio: course.data_inicio ? course.data_inicio.toISOString() : null,
      horario: course.horario,
      numero_inscritos: course.numero_inscritos,
      capacidade: course.capacidade,
      eh_itu: course.eh_itu,
    }));

    return NextResponse.json({
      total_registrations: totalRegistrations,
      by_repense: byRepense,
      by_city: byCity,
      top_courses: topCoursesFormatted,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}
