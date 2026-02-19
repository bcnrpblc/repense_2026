import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminOrTeacherAdminToken } from '@/lib/auth';

type MeResponse = {
  admin: {
    id: string;
    email: string;
    role: string;
    isTeacherAdmin?: boolean;
    /** True when admin has a Teacher account with same email (can switch to teacher view) */
    hasTeacherAccount?: boolean;
  };
};

type ErrorResponse = {
  error: string;
};

export async function GET(request: NextRequest) {
  try {
    // Verify token - supports both admin and teacher-admin tokens
    const tokenPayload = await verifyAdminOrTeacherAdminToken(request);

    // If it's a teacher-admin, return teacher info in admin-compatible format
    if (tokenPayload.isTeacherAdmin) {
      return NextResponse.json<MeResponse>(
        {
          admin: {
            id: tokenPayload.adminId,
            email: tokenPayload.email,
            role: 'teacher_admin', // Special role for teacher-admins (not superadmin)
            isTeacherAdmin: true,
          },
        },
        { status: 200 }
      );
    }

    // For regular admins, fetch from database
    const result = await prisma.$queryRaw<Array<{ id: string; email: string; role: string }>>`
      SELECT 
        id,
        email,
        COALESCE(role, 'admin') as role
      FROM "admins"
      WHERE id = ${tokenPayload.adminId}
    `;

    const admin = result[0];

    if (!admin) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Check if admin has a Teacher account with same email (can switch to teacher view)
    const teacherWithSameEmail = await prisma.teacher.findFirst({
      where: { email: admin.email, eh_ativo: true },
      select: { id: true },
    });
    const hasTeacherAccount = !!teacherWithSameEmail;

    return NextResponse.json<MeResponse>(
      {
        admin: {
          ...admin,
          isTeacherAdmin: false,
          hasTeacherAccount,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching admin:', error);

    // Handle authentication errors
    if (
      error.message === 'Missing or invalid authorization header' ||
      error.message === 'Missing token' ||
      error.message === 'Invalid token' ||
      error.message === 'Token expired' ||
      error.message === 'Token verification failed' ||
      error.message === 'Invalid admin token' ||
      error.message === 'Teacher does not have admin access'
    ) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Handle configuration errors
    if (error.message === 'JWT_SECRET not configured') {
      return NextResponse.json<ErrorResponse>(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Handle general errors
    return NextResponse.json<ErrorResponse>(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
