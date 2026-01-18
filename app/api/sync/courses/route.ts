import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GrupoRepense, ModeloCurso } from '@prisma/client';

// TypeScript types for the request body
type NotionCourse = {
  notion_id: string;
  grupo_repense: 'Igreja' | 'Espiritualidade' | 'Evangelho';
  modelo: 'online' | 'presencial';
  capacidade: number;
  eh_ativo: boolean;
  eh_16h?: boolean;
  eh_itu?: boolean; // City filter: true = Itu, false = Indaiatuba
  link?: string | null;
  data_inicio?: string; // ISO date format
  horario?: string; // Time format "HH:mm"
};

type SyncCoursesRequest = {
  courses: NotionCourse[];
};

type ErrorResponse = {
  error: string;
  validation_errors?: Record<string, string>;
};

export async function POST(request: NextRequest) {
  try {
    const body: SyncCoursesRequest = await request.json();
    const { courses } = body;

    // Validate request structure
    if (!courses || !Array.isArray(courses)) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing or invalid courses array' },
        { status: 400 }
      );
    }

    // Validate each course
    const validationErrors: Record<string, string> = {};
    
    courses.forEach((course, index) => {
      if (!course.notion_id) {
        validationErrors[`courses[${index}].notion_id`] = 'notion_id is required';
      }
      if (!course.grupo_repense || !['Igreja', 'Espiritualidade', 'Evangelho'].includes(course.grupo_repense)) {
        validationErrors[`courses[${index}].grupo_repense`] = 'grupo_repense must be Igreja, Espiritualidade, or Evangelho';
      }
      if (!course.modelo || !['online', 'presencial'].includes(course.modelo)) {
        validationErrors[`courses[${index}].modelo`] = 'modelo must be online or presencial';
      }
      if (!course.capacidade || course.capacidade < 1) {
        validationErrors[`courses[${index}].capacidade`] = 'capacidade must be a positive number';
      }
      
      // Validate horario format if provided (should be "HH:mm")
      if (course.horario && !/^\d{1,2}:\d{2}$/.test(course.horario)) {
        validationErrors[`courses[${index}].horario`] = 'horario must be in format "HH:mm" (e.g., "20:00" or "16:30")';
      }
      
      // Validate data_inicio format if provided (should be ISO date)
      if (course.data_inicio) {
        const date = new Date(course.data_inicio);
        if (isNaN(date.getTime())) {
          validationErrors[`courses[${index}].data_inicio`] = 'data_inicio must be a valid ISO date string';
        }
      }
    });

    // If there are validation errors, return 400
    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Validation errors',
          validation_errors: validationErrors,
        },
        { status: 400 }
      );
    }

    // Process courses in a transaction
    const results = await prisma.$transaction(
      courses.map((course) => {
        // Prepare data for upsert
        const courseData = {
          grupo_repense: course.grupo_repense as GrupoRepense,
          modelo: course.modelo as ModeloCurso,
          capacidade: course.capacidade,
          eh_ativo: course.eh_ativo,
          eh_16h: course.eh_16h ?? false,
          eh_itu: course.eh_itu ?? false,
          link: course.link || null,
          data_inicio: course.data_inicio ? new Date(course.data_inicio) : null,
          horario: course.horario || null,
        };

        // Upsert course (create or update)
        return prisma.course.upsert({
          where: { notion_id: course.notion_id },
          update: courseData,
          create: {
            notion_id: course.notion_id,
            ...courseData,
            numero_inscritos: 0, // Initialize with 0 enrolled
          },
        });
      })
    );

    return NextResponse.json(
      {
        success: true,
        processed: results.length,
        courses: results.map((course) => ({
          id: course.id,
          notion_id: course.notion_id,
          grupo_repense: course.grupo_repense,
          modelo: course.modelo,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error syncing courses:', error);

    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json<ErrorResponse>(
        { error: 'Duplicate notion_id found' },
        { status: 409 }
      );
    }

    // Handle other Prisma errors
    if (error.code && error.code.startsWith('P')) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // Handle general errors
    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
