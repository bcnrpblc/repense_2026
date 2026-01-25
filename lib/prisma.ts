import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

if (process.env.NODE_ENV === 'production') {
  // Use type assertion to enable Prisma event logging
  // The Prisma client may not have event types generated depending on the log config
  const prismaWithEvents = prisma as unknown as {
    $on: (event: string, callback: (e: Record<string, unknown>) => void) => void
  }

  prismaWithEvents.$on('error', (event) => {
    logger.error('prisma error', { err: event, target: event.target })
  })

  prismaWithEvents.$on('warn', (event) => {
    logger.warn('prisma warn', { message: event.message, target: event.target })
  })

  if (process.env.PRISMA_LOG_QUERIES === 'true') {
    const slowQueryMs = Number(process.env.PRISMA_SLOW_QUERY_MS ?? 500)
    prismaWithEvents.$on('query', (event) => {
      const duration = event.duration as number
      if (duration >= slowQueryMs) {
        logger.info('prisma slow query', {
          duration_ms: duration,
          query: event.query,
        })
      }
    })
  }
}

// Verify NotificationRead model exists (for debugging)
if (process.env.NODE_ENV === 'development' && !('notificationRead' in prisma)) {
  console.warn('[PRISMA] Warning: notificationRead model not found in Prisma Client. Please restart the server after running: npx prisma generate');
}
