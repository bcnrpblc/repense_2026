'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, Button } from '@/app/components/ui';

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
  lastSession: {
    id: string;
    numero_sessao: number;
    data_sessao: string;
  } | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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
      return 'bg-gray-100 text-gray-800';
  }
}

function getModelBadgeColor(modelo: string): string {
  return modelo === 'presencial' 
    ? 'bg-green-100 text-green-800' 
    : 'bg-blue-100 text-blue-800';
}

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

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
    />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ClassesSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex gap-2 mb-2">
                <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-6 w-48 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// TEACHER CLASSES PAGE
// ============================================================================

export default function TeacherClassesPage() {
  const { token } = useAuth({ requiredRole: 'teacher' });
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    async function fetchClasses() {
      if (!token) return;

      try {
        const response = await fetch('/api/teacher/classes', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch classes');

        const data = await response.json();
        setClasses(data.classes);
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, [token]);

  // Filter classes
  const filteredClasses = classes.filter((c) => {
    if (filter === 'active') return c.eh_ativo;
    if (filter === 'inactive') return !c.eh_ativo;
    return true;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Turmas</h1>
          <p className="mt-1 text-gray-600">
            Gerencie suas turmas e veja o histórico de sessões
          </p>
        </div>
        <Link href="/teacher/dashboard">
          <Button variant="secondary" size="sm">
            Voltar ao Dashboard
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todas ({classes.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'active'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Ativas ({classes.filter((c) => c.eh_ativo).length})
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'inactive'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Inativas ({classes.filter((c) => !c.eh_ativo).length})
        </button>
      </div>

      {/* Classes List */}
      {loading ? (
        <ClassesSkeleton />
      ) : filteredClasses.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500">
            {filter === 'all' 
              ? 'Nenhuma turma atribuída' 
              : `Nenhuma turma ${filter === 'active' ? 'ativa' : 'inativa'}`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredClasses.map((classItem) => (
            <Link 
              key={classItem.id} 
              href={`/teacher/classes/${classItem.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-all hover:border-blue-200 cursor-pointer">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Class Info */}
                  <div className="flex-1">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getGrupoBadgeColor(classItem.grupo_repense)}`}>
                        {classItem.grupo_repense}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getModelBadgeColor(classItem.modelo)}`}>
                        {classItem.modelo}
                      </span>
                      {!classItem.eh_ativo && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Inativa
                        </span>
                      )}
                      {classItem.eh_mulheres && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                          Mulheres
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">
                      {classItem.horario || 'Horário não definido'}
                    </h3>

                    {/* Details */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <LocationIcon />
                        <span>{classItem.cidade}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UsersIcon />
                        <span>{classItem.enrollmentCount}/{classItem.capacidade} alunos</span>
                      </div>
                      {classItem.lastSession && (
                        <div className="flex items-center gap-1">
                          <CalendarIcon />
                          <span>
                            Última sessão: {formatDate(classItem.lastSession.data_sessao)} 
                            (#{classItem.lastSession.numero_sessao})
                          </span>
                        </div>
                      )}
                      {!classItem.lastSession && (
                        <div className="flex items-center gap-1 text-gray-400">
                          <CalendarIcon />
                          <span>Nenhuma sessão realizada</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center text-gray-400">
                    <ChevronRightIcon />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
