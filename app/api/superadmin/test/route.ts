import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const superadmin = await requireSuperadmin(request);

    return NextResponse.json({
      success: true,
      message: 'Superadmin access confirmed',
      superadmin: {
        id: superadmin.adminId,
        email: superadmin.email,
        role: superadmin.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Superadmin access required' },
      { status: 403 }
    );
  }
}

