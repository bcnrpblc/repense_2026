'use client';

import { useState, useEffect } from 'react';
import { Card, StatCard } from '@/app/components/ui';
import { getAuthToken } from '@/lib/hooks/useAuth';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AnalyticsData {
  summary: {
    totalActiveClasses: number;
    totalActiveStudents: number;
    totalSessionsConducted: number;
    averageAttendanceRate: number;
    futureEnrollments: number;
    yearToDateEnrollments: number;
    dropOffRate: number;
    yearToDateDropOffRate: number;
  };
  enrollmentsByGrupo: {
    Igreja: number;
    Espiritualidade: number;
    Evangelho: number;
  };
  enrollmentsByCity: {
    Itu: number;
    Indaiatuba: number;
  };
  enrollmentsByStatus: {
    status: string;
    count: number;
  }[];
  capacityUtilization: {
    id: string;
    horario: string;
    grupo_repense: string;
    capacidade: number;
    inscritos: number;
    utilizacao: number;
  }[];
  sessionsPerWeek: {
    week: string;
    count: number;
  }[];
  generatedAt: string;
}

// ============================================================================
// CHART COLORS
// ============================================================================

const PIE_COLORS = [
  'hsl(var(--chart-5))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-4))'
];

// ============================================================================
// ICONS
// ============================================================================

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
    />
  </svg>
);

const ClassesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
    />
  </svg>
);

const SessionsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
    />
  </svg>
);

const AttendanceIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
    />
  </svg>
);

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
      <div className="h-64 bg-gray-100 rounded-lg"></div>
    </div>
  );
}

// ============================================================================
// ADMIN REPORTS PAGE
// ============================================================================

export default function AdminReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const token = getAuthToken();
        const response = await fetch('/api/admin/analytics/overview', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch analytics');

        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Erro ao carregar relatórios');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  // Prepare chart data
  const grupoChartData = data ? [
    { name: 'Igreja', value: data.enrollmentsByGrupo.Igreja },
    { name: 'Espiritualidade', value: data.enrollmentsByGrupo.Espiritualidade },
    { name: 'Evangelho', value: data.enrollmentsByGrupo.Evangelho },
  ] : [];


  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="mt-1 text-gray-600">Visualize métricas e análises do sistema</p>
        </div>

        {/* Loading Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl p-6 shadow-sm">
              <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Loading Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><ChartSkeleton /></Card>
          <Card><ChartSkeleton /></Card>
          <Card><ChartSkeleton /></Card>
          <Card><ChartSkeleton /></Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        </div>
        <Card className="text-center py-12 bg-red-50">
          <p className="text-red-600">{error || 'Erro ao carregar dados'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="mt-1 text-muted-foreground">
            Visualize métricas e análises do sistema
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Atualizado em: {new Date(data.generatedAt).toLocaleString('pt-BR')}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Grupos Ativos"
          value={data.summary.totalActiveClasses}
          icon={<ClassesIcon />}
        />
        <StatCard
          title="Participantes Ativos"
          value={data.summary.totalActiveStudents}
          icon={<UsersIcon />}
        />
        <StatCard
          title="Sessões Realizadas"
          value={data.summary.totalSessionsConducted}
          icon={<SessionsIcon />}
        />
        <StatCard
          title="Taxa Média de Presença"
          value={`${data.summary.averageAttendanceRate}%`}
          icon={<AttendanceIcon />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Enrollments by Grupo */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Inscrições por Grupo Repense
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={grupoChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                {grupoChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Taxa de Drop-off (geral) */}
        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Taxa de Drop-off (geral)
          </h3>
          <div className="p-6 pt-0 flex flex-col justify-center" style={{ height: '300px' }}>
            <div className="text-4xl font-bold mb-4">{data.summary.dropOffRate}%</div>
            <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  data.summary.dropOffRate > 20 ? 'bg-destructive' : 'bg-chart-4'
                }`}
                style={{ width: `${data.summary.dropOffRate}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              {data.summary.dropOffRate > 20 
                ? '⚠️ Atenção: Taxa de drop-off acima de 20%' 
                : 'Taxa dentro do esperado'}
            </p>
          </div>
        </Card>

        {/* Sessions Per Week */}
        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Sessões por Semana (Últimas 8 semanas)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.sessionsPerWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                name="Sessões"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Capacity Utilization */}
        <Card>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Taxa de Ocupação por Grupo
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.capacityUtilization} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis 
                dataKey="horario" 
                type="category" 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                width={100}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                formatter={(value) => [`${value}%`, 'Ocupação']}
              />
              <Bar 
                dataKey="utilizacao" 
                fill="hsl(var(--chart-3))" 
                radius={[0, 4, 4, 0]}
                name="Ocupação %"
              >
                {data.capacityUtilization.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.utilizacao >= 90 ? 'hsl(var(--destructive))' :
                      entry.utilizacao >= 70 ? 'hsl(var(--chart-4))' :
                      'hsl(var(--chart-3))'
                    } 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Enrollments by Status Table */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Inscrições por Status
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">
                  Quantidade
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">
                  Percentual
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.enrollmentsByStatus.map((item) => {
                const total = data.enrollmentsByStatus.reduce((sum, s) => sum + s.count, 0);
                const percent = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
                
                return (
                  <tr key={item.status} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'ativo' ? 'bg-green-100 text-green-800' :
                        item.status === 'concluido' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                        item.status === 'transferido' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {item.count}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {percent}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Export Button (placeholder) */}
      <div className="mt-6 flex justify-end">
        <button
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
          disabled
          title="Exportação será implementada em breve"
        >
          Exportar Relatório (em breve)
        </button>
      </div>
    </div>
  );
}
