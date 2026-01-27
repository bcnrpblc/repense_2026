import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/superadmin/audit-logs/export
 *
 * Export filtered audit logs as CSV (max 10,000 rows).
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperadmin(request);

    const { searchParams } = new URL(request.url);
    const event_type = searchParams.get('event_type');
    const actor_id = searchParams.get('actor_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const target_entity = searchParams.get('target_entity');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

    if (event_type) where.event_type = event_type;
    if (actor_id) where.actor_id = actor_id;
    if (target_entity) where.target_entity = target_entity;
    if (status) where.status = status;

    if (start_date && end_date) {
      where.criado_em = {
        gte: new Date(start_date),
        lte: new Date(end_date),
      };
    }

    if (search) {
      where.OR = [
        { event_type: { contains: search, mode: 'insensitive' } },
        { target_entity: { contains: search, mode: 'insensitive' } },
        { actor_type: { contains: search, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        Actor: {
          select: { email: true, role: true },
        },
      },
      orderBy: { criado_em: 'desc' },
      take: 10000,
    });

    const header = [
      'timestamp',
      'event_type',
      'actor_id',
      'actor_email',
      'actor_role',
      'actor_type',
      'target_entity',
      'target_id',
      'action',
      'status',
    ];

    const rows = logs.map((log) => [
      log.criado_em.toISOString(),
      log.event_type,
      log.actor_id ?? '',
      log.Actor?.email ?? '',
      log.Actor?.role ?? '',
      log.actor_type ?? '',
      log.target_entity ?? '',
      log.target_id ?? '',
      log.action ?? '',
      log.status,
    ]);

    const csv =
      [header, ...rows]
        .map((cols) =>
          cols
            .map((v) => {
              const value = String(v).replace(/"/g, '""');
              return `"${value}"`;
            })
            .join(',')
        )
        .join('\n') + '\n';

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="audit-logs.csv"',
      },
    });
  } catch (error) {
    console.error('Error exporting audit logs:', error);

    return NextResponse.json(
      { error: 'Erro ao exportar logs de auditoria' },
      { status: 500 }
    );
  }
}

