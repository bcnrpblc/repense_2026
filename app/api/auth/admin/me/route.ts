import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth';

type MeResponse = {
  admin: {
    id: string;
    email: string;
    role: string;
  };
};

type ErrorResponse = {
  error: string;
};

export async function GET(request: NextRequest) {
  try {
    // Verify token and get admin info
    const tokenPayload = await verifyAdminToken(request);

    // Fetch admin from database (excluding password_hash)
    const admin = await prisma.admin.findUnique({
      where: { id: tokenPayload.adminId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!admin) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<MeResponse>(
      {
        admin,
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
      error.message === 'Token verification failed'
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
