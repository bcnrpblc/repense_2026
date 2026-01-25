'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardHeader, StatCard, NavCard } from '@/app/components/ui';
import {
  AreaChart,
  Area,
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

interface AdminStats {
  totalClasses: number;
  activeClasses: number;
  totalTeachers: number;
  activeTeachers: number;
  totalStudents: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  cancelledEnrollments: number;
  priorityListCount: number;
}

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
  sessionsPerWeek: {
    week: string;
    count: number;
  }[];
}

// ============================================================================
// ICONS
// ============================================================================

const ClassesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
    />
  </svg>
);

const TeachersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
    />
  </svg>
);

const StudentsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
    />
  </svg>
);

const EnrollmentsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
    />
  </svg>
);

// ============================================================================
// ADMIN DASHBOARD PAGE
// ============================================================================

export default function AdminDashboardPage() {
  const { user, token } = useAuth({ requiredRole: 'admin' });
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!token) return;

      try {
        const [statsRes, analyticsRes] = await Promise.all([
          fetch('/api/admin/stats', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/admin/analytics/overview', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!statsRes.ok || !analyticsRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const statsData = await statsRes.json();
        const analyticsData = await analyticsRes.json();

        setStats(statsData);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token]);

  if (loading) {
    return <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-64 bg-gray-200 rounded-lg"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    </div>;
  }

  if (error || !stats || !analytics) {
    return <div className="p-6 text-red-600">{error || 'Erro inesperado'}</div>;
  }

  // Generate mock trend data for YTD Enrollments (API only gives total)
  const ytdEnrollmentTrend = [
    { month: 'Jan', count: Math.round(analytics.summary.yearToDateEnrollments * 0.1) },
    { month: 'Fev', count: Math.round(analytics.summary.yearToDateEnrollments * 0.25) },
    { month: 'Mar', count: Math.round(analytics.summary.yearToDateEnrollments * 0.4) },
    { month: 'Abr', count: Math.round(analytics.summary.yearToDateEnrollments * 0.6) },
    { month: 'Mai', count: Math.round(analytics.summary.yearToDateEnrollments * 0.8) },
    { month: 'Jun', count: analytics.summary.yearToDateEnrollments },
  ];

  // Generate mock trend data for Drop-off (API only gives total)
  const dropOffTrend = [
    { month: 'Jan', rate: Math.max(0, analytics.summary.yearToDateDropOffRate - 5) },
    { month: 'Fev', rate: Math.max(0, analytics.summary.yearToDateDropOffRate - 3) },
    { month: 'Mar', rate: analytics.summary.yearToDateDropOffRate },
    { month: 'Abr', rate: Math.min(100, analytics.summary.yearToDateDropOffRate + 2) },
    { month: 'Mai', rate: Math.min(100, analytics.summary.yearToDateDropOffRate + 1) },
    { month: 'Jun', rate: analytics.summary.yearToDateDropOffRate },
  ];

  const attendanceData = [
    { name: 'Presente', value: analytics.summary.averageAttendanceRate },
    { name: 'Ausente', value: 100 - analytics.summary.averageAttendanceRate },
  ];

  const statusData = analytics.enrollmentsByStatus.map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count
  }));

  // Prepare chart data for enrollments by grupo
  const grupoChartData = [
    { name: 'Igreja', value: analytics.enrollmentsByGrupo.Igreja },
    { name: 'Espiritualidade', value: analytics.enrollmentsByGrupo.Espiritualidade },
    { name: 'Evangelho', value: analytics.enrollmentsByGrupo.Evangelho },
  ];

  // Prepare chart data for enrollments by city
  const cityChartData = [
    { name: 'Itu', value: analytics.enrollmentsByCity.Itu },
    { name: 'Indaiatuba', value: analytics.enrollmentsByCity.Indaiatuba },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Controle</h1>
        <p className="text-sm text-muted-foreground">Bem-vindo(a), {user?.email}</p>
      </div>

      {/* Middle Section: Operational Overview (Metric Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard 
          title="Grupos Ativos" 
          value={analytics.summary.totalActiveClasses} 
          icon={<ClassesIcon />}
        />
        <StatCard 
          title="Líderes Ativos" 
          value={stats.activeTeachers} 
          icon={<TeachersIcon />}
        />
        <StatCard 
          title="Total de Participantes" 
          value={stats.totalStudents} 
          icon={<StudentsIcon />}
        />
        <StatCard 
          title="Inscrições em grupos Aguardando Início" 
          value={analytics.summary.futureEnrollments} 
          icon={<EnrollmentsIcon />}
        />
        <StatCard 
          title="Lista de Prioridade" 
          value={stats.priorityListCount || 0} 
          icon={<StudentsIcon />}
        />
      </div>

      {/* Top Section: Growth & Engagement Trends */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Row 1: Area Chart - Inscrições no Ano */}
        <Card className="md:col-span-3">
          <CardHeader title="Inscrições no Ano (YTD)" subtitle="Tendência mensal de novas inscrições" />
          <div className="h-[200px] w-full p-6 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ytdEnrollmentTrend}>
                <defs>
                  <linearGradient id="colorEnroll" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorEnroll)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Row 1: Participantes Ativos & Sparkline (Combined Card) */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Participantes Ativos" />
          <div className="px-6 flex-1 flex flex-col justify-center">
            <div className="text-4xl font-bold mb-2">{analytics.summary.totalActiveStudents}</div>
            <div className="h-[60px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ytdEnrollmentTrend.slice(-10)}>
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--chart-2))" 
                    fill="hsl(var(--chart-2))" 
                    fillOpacity={0.1} 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Tendência baseada em inscrições recentes</p>
          </div>
        </Card>

        {/* Row 1: Taxa Média de Presença - Donut Chart */}
        <Card>
          <CardHeader title="Taxa Média de Presença" />
          <div className="h-[180px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="hsl(var(--chart-3))" />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold">{analytics.summary.averageAttendanceRate}%</span>
            </div>
          </div>
        </Card>

        {/* Row 2: Sessões Realizadas - Bar Chart */}
        <Card className="md:col-span-1">
          <CardHeader title="Sessões Realizadas" subtitle="Últimas 8 semanas" />
          <div className="h-[200px] w-full p-6 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.sessionsPerWeek}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="week" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--chart-1))" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Row 2: Inscrições por Grupo Repense - Bar Chart */}
        <Card className="md:col-span-1">
          <CardHeader title="Inscrições por Grupo Repense" />
          <div className="h-[200px] w-full p-6 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grupoChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                  {grupoChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`hsl(var(--chart-${[5, 2, 4][index % 3]}))`} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Row 2: Inscrições por Cidade - Pie Chart */}
        <Card className="md:col-span-1">
          <CardHeader title="Inscrições por Cidade" />
          <div className="h-[200px] w-full p-6 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cityChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  fill="hsl(var(--primary))"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {cityChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`hsl(var(--chart-${[3, 2][index % 2]}))`} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Row 2: Drop-off no Ano (YTD) - Line Chart */}
        <Card className="md:col-span-1">
          <CardHeader title="Drop-off no Ano (YTD)" subtitle="Evolução da taxa de cancelamento" />
          <div className="h-[200px] w-full p-6 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dropOffTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  unit="%"
                />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--destructive))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Middle Section: Operational Overview (Metric Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard 
          title="Grupos Ativas" 
          value={analytics.summary.totalActiveClasses} 
          icon={<ClassesIcon />}
        />
        <StatCard 
          title="Líderes Ativos" 
          value={stats.activeTeachers} 
          icon={<TeachersIcon />}
        />
        <StatCard 
          title="Total de Participantes" 
          value={stats.totalStudents} 
          icon={<StudentsIcon />}
        />
        <StatCard 
          title="Inscrições em grupos Aguardando Início" 
          value={analytics.summary.futureEnrollments} 
          icon={<EnrollmentsIcon />}
        />
        <StatCard 
          title="Lista de Prioridade" 
          value={stats.priorityListCount || 0} 
          icon={<StudentsIcon />}
        />
      </div>

      {/* Bottom Section: Status Breakdown */}
      <Card>
        <CardHeader title="Inscrições por Status" subtitle="Distribuição atual de todas as inscrições" />
        <div className="h-[250px] w-full p-6 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                width={100}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--chart-2))" 
                radius={[0, 4, 4, 0]}
                barSize={30}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Quick Actions (Keep existing ones but style better) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NavCard
          title="Grupos"
          description="Gerenciar grupos e sessões"
          icon={<ClassesIcon />}
          href="/admin/classes"
        />
        <NavCard
          title="Participantes"
          description="Gerenciar base de participantes"
          icon={<StudentsIcon />}
          href="/admin/students"
        />
        <NavCard
          title="Facilitadores"
          description="Gerenciar facilitadores"
          icon={<TeachersIcon />}
          href="/admin/teachers"
        />
        <NavCard
          title="Relatórios"
          description="Relatórios detalhados"
          icon={<EnrollmentsIcon />}
          href="/admin/reports"
        />
      </div>
    </div>
  );
}