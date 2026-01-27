'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardHeader } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { EventCard } from '@/app/components/EventCard';
import { DatePicker } from '@/app/components/DatePicker';

interface AuditLogWithActor {
  id: string;
  event_type: string;
  actor_id: string | null;
  actor_type: string | null;
  target_entity: string | null;
  target_id: string | null;
  action: string | null;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  error_message: string | null;
  criado_em: string;
  Actor?: {
    email: string | null;
    role: string | null;
  } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function SuperadminActivityPage() {
  const { token } = useAuth({ requiredRole: 'admin' });
  const [logs, setLogs] = useState<AuditLogWithActor[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [targetEntityFilter, setTargetEntityFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);

  async function fetchLogs(currentPage: number, options?: { silent?: boolean }) {
    if (!token) return;
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', '50');
      if (search.trim()) {
        params.set('search', search.trim());
      }
      if (statusFilter) {
        params.set('status', statusFilter);
      }
      if (eventTypeFilter) {
        params.set('event_type', eventTypeFilter);
      }
      if (targetEntityFilter) {
        params.set('target_entity', targetEntityFilter);
      }
      if (startDate) {
        params.set('start_date', startDate);
      }
      if (endDate) {
        params.set('end_date', endDate);
      }

      const res = await fetch(`/api/superadmin/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao carregar logs de auditoria');
      }

      const data = await res.json();
      setLogs(data.logs ?? []);
      setPagination(data.pagination ?? null);
      setPage(currentPage);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar logs de auditoria'
      );
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    fetchLogs(1);
    const interval = setInterval(() => {
      fetchLogs(page, { silent: true });
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search, statusFilter, eventTypeFilter, targetEntityFilter, startDate, endDate]);

  function handleApplyFilters() {
    fetchLogs(1);
  }

  async function handleExport() {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set('search', search.trim());
      }
      if (statusFilter) {
        params.set('status', statusFilter);
      }
      if (eventTypeFilter) {
        params.set('event_type', eventTypeFilter);
      }
      if (targetEntityFilter) {
        params.set('target_entity', targetEntityFilter);
      }
      if (startDate) {
        params.set('start_date', startDate);
      }
      if (endDate) {
        params.set('end_date', endDate);
      }

      const res = await fetch(
        `/api/superadmin/audit-logs/export?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error('Falha ao exportar CSV');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-logs.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError(
        err instanceof Error ? err.message : 'Erro ao exportar CSV'
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Histórico de Atividades
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualize ações importantes realizadas no sistema. Atualiza
            automaticamente a cada 30 segundos.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => fetchLogs(page)}>
          Atualizar agora
        </Button>
      </div>

      <Card
        header={
          <CardHeader
            title="Filtros"
            subtitle="Refine os eventos exibidos no histórico"
          />
        }
      >
        <div className="space-y-4">
          {/* First Row: Search and Quick Filters */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Input
                label="Busca livre"
                placeholder="Buscar por tipo de evento, entidade, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tipo de Evento
              </label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Todos</option>
                <option value="auth_login_success">Login Sucesso</option>
                <option value="auth_login_failure">Login Falha</option>
                <option value="data_student_update">Atualização Participante</option>
                <option value="data_class_create">Criação Grupo</option>
                <option value="data_class_update">Atualização Grupo</option>
                <option value="data_class_delete">Arquivar Grupo</option>
                <option value="data_enrollment_update">Atualização Inscrição</option>
                <option value="admin_password_reset">Redefinição Senha</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Todos</option>
                <option value="success">Sucesso</option>
                <option value="failure">Falha</option>
                <option value="error">Erro</option>
              </select>
            </div>
          </div>

          {/* Second Row: Entity and Date Filters */}
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Entidade Alvo
              </label>
              <select
                value={targetEntityFilter}
                onChange={(e) => setTargetEntityFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Todas</option>
                <option value="Student">Participante</option>
                <option value="Class">Grupo</option>
                <option value="Enrollment">Inscrição</option>
                <option value="Admin">Admin</option>
                <option value="Teacher">Facilitador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Data Início
              </label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Selecione a data"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Data Fim
              </label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="Selecione a data"
                minDate={startDate ? new Date(startDate) : undefined}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" variant="primary" onClick={handleApplyFilters}>
                Aplicar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setEventTypeFilter('');
                  setTargetEntityFilter('');
                  setStartDate('');
                  setEndDate('');
                  fetchLogs(1);
                }}
              >
                Limpar
              </Button>
            </div>
          </div>

          {/* Third Row: Export */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleExport}
            >
              Exportar CSV
            </Button>
          </div>
        </div>
      </Card>

      {loading && (
        <p className="text-sm text-muted-foreground">Carregando eventos...</p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && logs.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum evento encontrado para os filtros atuais.
        </p>
      )}

      {!loading && logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => (
            <EventCard key={log.id} event={log} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchLogs(pagination.page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

