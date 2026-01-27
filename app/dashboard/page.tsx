'use client';

import { useEffect, useState } from 'react';
import { formatDayOfWeek, formatMonth, formatTime } from '@/lib/date-formatters';
import { GrupoRepense, ModeloCurso } from '@/types/client-enums';

interface DashboardData {
  total_registrations: number;
  by_repense: {
    Igreja: number;
    Espiritualidade: number;
    Evangelho: number;
  };
  by_city: {
    Indaiatuba: number;
    Itu: number;
  };
  top_courses: {
    notion_id: string;
    grupo_repense: GrupoRepense;
    modelo: ModeloCurso;
    data_inicio: string | null;
    horario: string | null;
    cidade: string | null;
    numero_inscritos: number;
    capacidade: number;
  }[];
  last_updated: string;
}

const grupoLabels: Record<GrupoRepense, string> = {
  Igreja: 'Igreja',
  Espiritualidade: 'Espiritualidade',
  Evangelho: 'Evangelho',
};

const modeloLabels: Record<ModeloCurso, string> = {
  online: 'Online',
  presencial: 'Presencial',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const dashboardData = await response.json();
      setData(dashboardData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatLastUpdated = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCourseDate = (dataInicio: string | null, horario: string | null) => {
    if (!dataInicio || !horario) {
      return 'Data/hora não definida';
    }
    try {
      const dateObj = new Date(dataInicio);
      const dayOfWeek = formatDayOfWeek(dateObj);
      const day = dateObj.getDate();
      const month = formatMonth(dateObj);
      const time = formatTime(horario);
      return `${dayOfWeek}, ${day} de ${month} às ${time}`;
    } catch {
      return 'Data/hora inválida';
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#c92041] mb-4"></div>
              <p className="text-gray-600">Carregando dados...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-semibold">Erro ao carregar dados</p>
            <p className="text-red-600 mt-2">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-[#c92041] text-white rounded-lg hover:bg-[#a01a33] transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const totalCity = data.by_city.Indaiatuba + data.by_city.Itu;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Dashboard de Inscrições - PG Repense
          </h1>
          <p className="text-gray-600">
            Última atualização: <span className="font-semibold">{formatLastUpdated(data.last_updated)}</span>
          </p>
        </div>

        {/* Total Registrations Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Total de Inscrições</h2>
          <p className="text-5xl md:text-6xl font-bold text-[#c92041]">{data.total_registrations.toLocaleString('pt-BR')}</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* By Repense Type */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Por Tipo de Repense</h2>
            <div className="space-y-4">
              {Object.entries(data.by_repense).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 font-medium">{grupoLabels[key as GrupoRepense]}</span>
                    <span className="text-2xl font-bold text-[#c92041]">{value.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-[#c92041] h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${data.total_registrations > 0 ? (value / data.total_registrations) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By City */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Por Cidade</h2>
            <div className="space-y-4">
              {Object.entries(data.by_city).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 font-medium">{key}</span>
                    <span className="text-2xl font-bold text-[#c92041]">{value.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-[#c92041] h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${totalCity > 0 ? (value / totalCity) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top 5 Courses */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">Top 5 PG Repense por Inscrições</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Grupo Repense</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Modelo</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Data/Hora</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cidade</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Inscrições</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Capacidade</th>
                </tr>
              </thead>
              <tbody>
                {data.top_courses.map((course) => (
                  <tr key={course.notion_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 text-sm text-gray-900">{grupoLabels[course.grupo_repense]}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{modeloLabels[course.modelo]}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">
                      {formatCourseDate(course.data_inicio, course.horario)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">{course.cidade || 'Indaiatuba'}</td>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">{course.numero_inscritos}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-12">{course.capacidade}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-3 max-w-32">
                          <div
                            className="bg-[#c92041] h-3 rounded-full transition-all duration-500"
                            style={{
                              width: `${(course.numero_inscritos / course.capacidade) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Os dados são atualizados automaticamente a cada 30 segundos</p>
        </div>
      </div>
    </div>
  );
}
