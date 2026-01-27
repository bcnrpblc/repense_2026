import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/superadmin/audit-logs
 *
 * List audit logs with filtering and simple search.
 * Requires superadmin privileges.
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
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10),
      100
    );
    const skip = (page - 1) * limit;

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

    // Use raw SQL for metadata JSON search if search term provided
    if (search) {
      const searchTerm = `%${search}%`;
      const params: any[] = [searchTerm];
      let paramIndex = 2;

      // Build search conditions (OR)
      const searchConditions: string[] = [
        `al."event_type" ILIKE $1`,
        `al."target_entity" ILIKE $1`,
        `al."actor_type" ILIKE $1`,
        `al."metadata"::text ILIKE $1`,
        `EXISTS (
          SELECT 1 FROM "admins" 
          WHERE "admins"."id" = al."actor_id" 
          AND "admins"."email" ILIKE $1
        )`,
      ];

      // Build filter conditions (AND)
      const filterConditions: string[] = [];
      if (event_type) {
        filterConditions.push(`al."event_type" = $${paramIndex}`);
        params.push(event_type);
        paramIndex++;
      }
      if (actor_id) {
        filterConditions.push(`al."actor_id" = $${paramIndex}`);
        params.push(actor_id);
        paramIndex++;
      }
      if (target_entity) {
        filterConditions.push(`al."target_entity" = $${paramIndex}`);
        params.push(target_entity);
        paramIndex++;
      }
      if (status) {
        filterConditions.push(`al."status" = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }
      if (start_date && end_date) {
        filterConditions.push(`al."criado_em" BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        params.push(new Date(start_date), new Date(end_date));
        paramIndex += 2;
      }

      const searchClause = `(${searchConditions.join(' OR ')})`;
      const filterClause = filterConditions.length > 0 
        ? ` AND ${filterConditions.join(' AND ')}`
        : '';
      const whereClause = searchClause + filterClause;
      const searchQuery = `
        SELECT 
          al.*,
          json_build_object(
            'id', a.id,
            'email', a.email,
            'role', a.role
          ) as "Actor"
        FROM "audit_logs" al
        LEFT JOIN "admins" a ON a.id = al."actor_id"
        WHERE (${whereClause})
        ORDER BY al."criado_em" DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, skip);

      const countQuery = `
        SELECT COUNT(*) as count
        FROM "audit_logs" al
        LEFT JOIN "admins" a ON a.id = al."actor_id"
        WHERE (${whereClause})
      `;

      const logsRaw = await prisma.$queryRawUnsafe(searchQuery, ...params);
      const countRaw = (await prisma.$queryRawUnsafe(countQuery, ...params.slice(0, -2))) as Array<{ count: bigint | number | string }>;

      const logs = (logsRaw as any[]).map((row: any) => {
        const actor = row.Actor && row.Actor.id 
          ? { id: row.Actor.id, email: row.Actor.email, role: row.Actor.role }
          : null;
        return {
          id: row.id,
          event_type: row.event_type,
          actor_id: row.actor_id,
          actor_type: row.actor_type,
          target_entity: row.target_entity,
          target_id: row.target_id,
          action: row.action,
          metadata: row.metadata,
          ip_address: row.ip_address,
          user_agent: row.user_agent,
          status: row.status,
          error_message: row.error_message,
          criado_em: row.criado_em,
          Actor: actor,
        };
      });

      const countValue = countRaw[0]?.count;
      const total = typeof countValue === 'bigint' 
        ? Number(countValue) 
        : typeof countValue === 'string' 
        ? parseInt(countValue, 10) 
        : countValue || 0;

      return NextResponse.json({
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Use Prisma for non-search queries (faster)
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          Actor: {
            select: { id: true, email: true, role: true },
          },
        },
        orderBy: { criado_em: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);

    return NextResponse.json(
      { error: 'Erro ao carregar logs de auditoria' },
      { status: 500 }
    );
  }
}

