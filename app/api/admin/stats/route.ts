import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrTeacherAdminToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ============================================================================
// GET /api/admin/stats
// ============================================================================

/**
 * Admin dashboard statistics endpoint
 * 
 * Returns aggregate statistics for the admin dashboard:
 * - Total and active classes
 * - Total and active teachers
 * - Total students
 * - Total enrollments (by status)
 * 
 * Requires: Authorization header with valid admin JWT token
 * 
 * Success response (200):
 * {
 *   "totalClasses": 10,
 *   "activeClasses": 8,
 *   "totalTeachers": 5,
 *   "activeTeachers": 4,
 *   "totalStudents": 150,
 *   "totalEnrollments": 180,
 *   "activeEnrollments": 160,
 *   "completedEnrollments": 15,
 *   "cancelledEnrollments": 5
 * }
 * 
 * Error responses:
 * - 401: Unauthorized (missing or invalid token)
 * - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin or teacher-admin token - throws if invalid
    await verifyAdminOrTeacherAdminToken(request);

    // Get students with priority list and no active enrollments
    const studentsWithPriority = await prisma.student.findMany({
      where: { 
        priority_list: true,
      },
      include: {
        enrollments: {
          where: { status: 'ativo' },
          select: { id: true },
        },
      },
    });

    // Filter to only those without active enrollments
    const priorityListCount = studentsWithPriority.filter(
      (s) => s.enrollments.length === 0
    ).length;

    // Run all count queries in parallel for better performance
    const [
      totalClasses,
      activeClasses,
      totalTeachers,
      activeTeachers,
      totalStudents,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      cancelledEnrollments,
    ] = await Promise.all([
      // Classes counts
      prisma.class.count(),
      prisma.class.count({ where: { eh_ativo: true } }),
      
      // Teachers counts
      prisma.teacher.count(),
      prisma.teacher.count({ where: { eh_ativo: true } }),
      
      // Students count
      prisma.student.count(),
      
      // Enrollments counts by status
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { status: 'ativo' } }),
      prisma.enrollment.count({ where: { status: 'concluido' } }),
      prisma.enrollment.count({ where: { status: 'cancelado' } }),
    ]);

    return NextResponse.json({
      totalClasses,
      activeClasses,
      totalTeachers,
      activeTeachers,
      totalStudents,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      cancelledEnrollments,
      priorityListCount,
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);

    // Handle authentication errors
    if (error instanceof Error) {
      if (
        error.message.includes('token') ||
        error.message.includes('authorization') ||
        error.message.includes('expired')
      ) {
        return NextResponse.json(
          { error: 'Não autorizado' },
          { status: 401 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
