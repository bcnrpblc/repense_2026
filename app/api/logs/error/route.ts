import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/file-logger';

export const dynamic = 'force-dynamic';

type ErrorLogRequest = {
  message: string;
  error: {
    name?: string;
    message: string;
    stack?: string;
    digest?: string;
  };
  url?: string;
  userAgent?: string;
  timestamp?: string;
  context?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  try {
    const body: ErrorLogRequest = await request.json();
    const { message, error, url, userAgent, context } = body;

    // Get client IP
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Log the error to file
    logError(message || 'Client-side error', error, {
      url: url || request.url,
      userAgent: userAgent || request.headers.get('user-agent') || 'unknown',
      ip,
      ...context,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // Even if logging fails, don't crash
    console.error('Failed to log error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
