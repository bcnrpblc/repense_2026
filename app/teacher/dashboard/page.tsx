'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, Button } from '@/app/components/ui';
import toast from 'react-hot-toast';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TeacherClass {
  id: string;
  grupo_repense: string;
  modelo: string;
  capacidade: number;
  numero_inscritos: number;
  eh_ativo: boolean;
  eh_16h: boolean;
  eh_mulheres: boolean;
  eh_itu: boolean;
  horario: string | null;
  data_inicio: string | null;
  link_whatsapp: string | null;
  numero_sessoes: number;
  cidade: string;
  enrollmentCount: number;
  nextSession: {
    id: string;
    numero_sessao: number;
    data_sessao: string;
  } | null;
  lastSession: {
    id: string;
    numero_sessao: number;
    data_sessao: string;
  } | null;
}

interface ClassesResponse {
  classes: TeacherClass[];
  totalClasses: number;
  activeClasses: number;
}

interface TeacherInfo {
  nome: string;
  email: string;
}

interface ActiveSession {
  id: string;
  numero_sessao: number;
  data_sessao: string;
  class: {
    id: string;
    grupo_repense: string;
    horario: string | null;
    cidade: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getModelBadgeColor(modelo: string): string {
  return modelo === 'presencial' 
    ? 'bg-green-100 text-green-800' 
    : 'bg-primary/10 text-primary';
}

function getGrupoBadgeColor(grupo: string): string {
  switch (grupo) {
    case 'Igreja':
      return 'bg-purple-100 text-purple-800';
    case 'Espiritualidade':
      return 'bg-indigo-100 text-indigo-800';
    case 'Evangelho':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

// ============================================================================
// ICONS
// ============================================================================

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
    />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
    />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
    />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
    />
  </svg>
);

// ============================================================================
// LOADING SKELETON COMPONENT
// ============================================================================

function ClassesSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// ACTIVE SESSION BANNER COMPONENT
// ============================================================================

interface ActiveSessionBannerProps {
  session: ActiveSession;
}

function ActiveSessionBanner({ session }: ActiveSessionBannerProps) {
  return (
    <div className="mb-6 bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <PlayIcon />
          </div>
          <div>
            <h3 className="font-semibold">Sessão em Andamento</h3>
            <p className="text-sm text-green-100">
              {session.class.grupo_repense} - {session.class.horario || 'Sem horário'} • 
              Sessão #{session.numero_sessao}
            </p>
          </div>
        </div>
        <Link
          href={`/teacher/classes/${session.class.id}/session`}
          className="inline-flex items-center justify-center px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
        >
          Continuar Sessão
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// CLASS CARD COMPONENT
// ============================================================================

interface ClassCardProps {
  classData: TeacherClass;
  hasActiveSession: boolean;
  activeSessionClassId: string | null;
  onStartSession: (classId: string) => void;
  startingSession: boolean;
}

function ClassCard({ 
  classData, 
  hasActiveSession, 
  activeSessionClassId,
  onStartSession,
  startingSession,
}: ClassCardProps) {
  const isThisClassActive = activeSessionClassId === classData.id;
  const canStartSession = !hasActiveSession && classData.eh_ativo;

  return (
    <Card className="hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getGrupoBadgeColor(classData.grupo_repense)}`}>
              {classData.grupo_repense}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getModelBadgeColor(classData.modelo)}`}>
              {classData.modelo}
            </span>
            {classData.eh_mulheres && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                Mulheres
              </span>
            )}
            {classData.eh_16h && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                16h
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900">
            {classData.horario || 'Horário não definido'}
          </h3>
        </div>
        {!classData.eh_ativo && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Inativa
          </span>
        )}
        {isThisClassActive && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
            Em Sessão
          </span>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <LocationIcon />
          <span>{classData.cidade}</span>
        </div>
        <div className="flex items-center gap-2">
          <UsersIcon />
          <span>{classData.enrollmentCount}/{classData.capacidade} alunos</span>
        </div>
        {classData.lastSession && (
          <div className="flex items-center gap-2 col-span-2 text-gray-400">
            <ClockIcon />
            <span>
              Última: Sessão {classData.lastSession.numero_sessao} - {formatDate(classData.lastSession.data_sessao)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-100">
        {isThisClassActive ? (
          <Link
            href={`/teacher/classes/${classData.id}/session`}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            Continuar Sessão
          </Link>
        ) : (
          <Button
            variant="primary"
            size="sm"
            disabled={!canStartSession || startingSession}
            onClick={() => onStartSession(classData.id)}
            title={
              hasActiveSession 
                ? 'Finalize a sessão atual antes de iniciar outra' 
                : !classData.eh_ativo 
                  ? 'Turma inativa'
                  : 'Iniciar nova sessão'
            }
          >
            {startingSession ? 'Iniciando...' : 'Iniciar Sessão'}
          </Button>
        )}
        <Link
          href={`/teacher/classes/${classData.id}`}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Ver Histórico
        </Link>
        {classData.link_whatsapp && (
          <a
            href={classData.link_whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            WhatsApp
          </a>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// UPCOMING SESSIONS COMPONENT
// ============================================================================

interface UpcomingSessionsProps {
  classes: TeacherClass[];
}

function UpcomingSessions({ classes }: UpcomingSessionsProps) {
  const upcomingSessions = classes
    .filter((c) => c.nextSession && c.eh_ativo)
    .map((c) => ({
      ...c.nextSession!,
      classData: c,
    }))
    .sort((a, b) => new Date(a.data_sessao).getTime() - new Date(b.data_sessao).getTime())
    .slice(0, 5);

  if (upcomingSessions.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-gray-500">Nenhuma sessão agendada</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {upcomingSessions.map((session) => (
        <Card key={session.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">
              Sessão {session.numero_sessao} - {session.classData.grupo_repense}
            </p>
            <p className="text-sm text-gray-500">
              {session.classData.horario} - {session.classData.cidade}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-blue-600">
              {formatDate(session.data_sessao)}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// TEACHER DASHBOARD PAGE
// ============================================================================

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { user, token } = useAuth({ requiredRole: 'teacher' });
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
  const [classesData, setClassesData] = useState<ClassesResponse | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      const [teacherResponse, classesResponse, activeSessionResponse] = await Promise.all([
        fetch('/api/auth/teacher/me', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/teacher/classes', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/teacher/sessions/active', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!teacherResponse.ok || !classesResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const teacherData = await teacherResponse.json();
      const classesDataResult = await classesResponse.json();
      const activeSessionResult = await activeSessionResponse.json();

      setTeacherInfo({
        nome: teacherData.teacher.nome,
        email: teacherData.teacher.email,
      });
      setClassesData(classesDataResult);
      setActiveSession(activeSessionResult.session);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle starting a new session
  const handleStartSession = async (classId: string) => {
    if (!token) return;

    setStartingSession(true);
    try {
      const response = await fetch('/api/teacher/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ classId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao iniciar sessão');
        return;
      }

      toast.success('Sessão iniciada!');
      router.push(`/teacher/classes/${classId}/session`);
    } catch (err) {
      console.error('Error starting session:', err);
      toast.error('Erro ao iniciar sessão');
    } finally {
      setStartingSession(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Bem-vindo(a), <span className="font-medium">{teacherInfo?.nome || user?.email}</span>
        </p>
      </div>

      {/* Active Session Banner */}
      {activeSession && <ActiveSessionBanner session={activeSession} />}

      {/* Quick Stats */}
      {classesData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {classesData.totalClasses}
              </p>
              <p className="text-sm text-muted-foreground">Turmas Atribuídas</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-chart-3">
                {classesData.activeClasses}
              </p>
              <p className="text-sm text-muted-foreground">Turmas Ativas</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-chart-5">
                {classesData.classes.reduce((sum, c) => sum + c.enrollmentCount, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total de Alunos</p>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My Classes Section */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Minhas Turmas
            </h2>
            <Link
              href="/teacher/classes"
              className="text-sm text-primary hover:underline"
            >
              Ver todas
            </Link>
          </div>

          {loading ? (
            <ClassesSkeleton />
          ) : error ? (
            <Card className="bg-destructive/10 border-destructive/20">
              <p className="text-destructive">{error}</p>
            </Card>
          ) : classesData && classesData.classes.length > 0 ? (
            <div className="space-y-4">
              {classesData.classes.slice(0, 5).map((classItem) => (
                <ClassCard 
                  key={classItem.id} 
                  classData={classItem}
                  hasActiveSession={!!activeSession}
                  activeSessionClassId={activeSession?.class.id || null}
                  onStartSession={handleStartSession}
                  startingSession={startingSession}
                />
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <p className="text-gray-500">Nenhuma turma atribuída</p>
            </Card>
          )}
        </div>

        {/* Upcoming Sessions Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Próximas Aulas
          </h2>

          {loading ? (
            <ClassesSkeleton />
          ) : classesData ? (
            <UpcomingSessions classes={classesData.classes} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
