import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GrupoRepense, ModeloCurso } from '@prisma/client';

export const dynamic = 'force-dynamic';

// TypeScript types for the response
type CourseWithVacancies = {
  id: string;
  notion_id: string | null;
  grupo_repense: GrupoRepense;
  modelo: ModeloCurso;
  capacidade: number;
  numero_inscritos: number;
  eh_ativo: boolean;
  eh_16h: boolean;
  eh_mulheres: boolean;
  eh_itu: boolean;
  link_whatsapp: string | null;
  data_inicio: string | null;
  horario: string | null;
  vagas_disponiveis: number;
};

type GroupedCoursesByGrupo = {
  [K in GrupoRepense]: CourseWithVacancies[];
};

type GroupedCoursesResponse = {
  indaiatuba: GroupedCoursesByGrupo;
  itu: GroupedCoursesByGrupo;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const genero = searchParams.get('genero');

    // Build where clause for courses
    const whereClause: any = {
      eh_ativo: true,
    };

    // Filter by gender: if Masculino, exclude women-only courses
    if (genero === 'Masculino') {
      whereClause.eh_mulheres = false;
    }
    // If genero=Feminino or no genero param: show all courses (no filter)

    // If student_id is provided, exclude courses the student is already enrolled in
    if (studentId) {
      // First, verify the student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }

      // Get enrolled course IDs for this student
      const enrollments = await prisma.enrollment.findMany({
        where: { student_id: studentId },
        select: { class_id: true },
      });

      const enrolledCourseIds = enrollments.map((e) => e.class_id);

      // Exclude enrolled courses
      if (enrolledCourseIds.length > 0) {
        whereClause.id = {
          notIn: enrolledCourseIds,
        };
      }
    }

    // Fetch active courses
    const courses = await prisma.class.findMany({
      where: whereClause,
      orderBy: [
        { grupo_repense: 'asc' },
        { modelo: 'asc' },
      ],
    });

    // Calculate vagas_disponiveis and map to CourseWithVacancies
    const coursesWithVacancies: CourseWithVacancies[] = courses.map(
      (course) => ({
        id: course.id,
        notion_id: course.notion_id,
        grupo_repense: course.grupo_repense,
        modelo: course.modelo,
        capacidade: course.capacidade,
        numero_inscritos: course.numero_inscritos,
        eh_ativo: course.eh_ativo,
        eh_16h: course.eh_16h,
        eh_mulheres: course.eh_mulheres,
        eh_itu: course.eh_itu,
        link_whatsapp: course.link_whatsapp,
        data_inicio: course.data_inicio ? course.data_inicio.toISOString() : null,
        horario: course.horario,
        vagas_disponiveis: course.capacidade - course.numero_inscritos,
      })
    );

    // Group courses by city (eh_itu), then by grupo_repense
    const groupedCourses: GroupedCoursesResponse = {
      indaiatuba: {
        Igreja: [],
        Espiritualidade: [],
        Evangelho: [],
      },
      itu: {
        Igreja: [],
        Espiritualidade: [],
        Evangelho: [],
      },
    };

    coursesWithVacancies.forEach((course) => {
      const cityKey = course.eh_itu ? 'itu' : 'indaiatuba';
      groupedCourses[cityKey][course.grupo_repense].push(course);
    });

    return NextResponse.json(groupedCourses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
