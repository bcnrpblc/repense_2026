import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit, RateLimitConfigs } from '@/lib/rateLimit'
import { logAuditEvent } from '@/lib/audit'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional().default(false)
})

export async function POST(request: NextRequest) {
  // Apply rate limiting (10 requests per minute)
  const rateLimitResult = rateLimit(request, RateLimitConfigs.auth);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const body = await request.json()
    const { email, password, rememberMe } = loginSchema.parse(body)

    const admin = await prisma.admin.findUnique({
      where: { email }
    })

    if (!admin) {
      await logAuditEvent(
        {
          event_type: 'auth_login_failure',
          actor_type: 'admin',
          action: 'login',
          status: 'failure',
          metadata: { email, reason: 'Admin not found' },
        },
        request
      )

      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    const isValid = await bcrypt.compare(password, admin.password_hash)

    if (!isValid) {
      await logAuditEvent(
        {
          event_type: 'auth_login_failure',
          actor_id: admin.id,
          actor_type: 'admin',
          action: 'login',
          status: 'failure',
          metadata: { email, reason: 'Invalid credentials' },
        },
        request
      )

      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }
    
    // Handle backward compatibility: role column may not exist yet
    const adminRole = (admin as any).role || 'admin';
    
    const expiresIn = rememberMe ? '90d' : '30d';
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: adminRole },
      process.env.JWT_SECRET!,
      { expiresIn }
    )

    await logAuditEvent(
      {
        event_type: 'auth_login_success',
        actor_id: admin.id,
        actor_type: 'admin',
        action: 'login',
        metadata: { email: admin.email, role: adminRole },
      },
      request
    )

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error logging in admin:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}