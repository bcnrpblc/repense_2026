'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface PriorityListData {
  student_id: string;
  course: {
    id: string;
    grupo_repense: string;
    modelo: string;
    horario: string | null;
  };
  priority_list_added_at: string;
}

const grupoLabels: Record<string, string> = {
  Igreja: 'Igreja',
  Espiritualidade: 'Espiritualidade',
  Evangelho: 'Evangelho',
};

const modeloLabels: Record<string, string> = {
  online: 'Online',
  presencial: 'Presencial',
};

export default function PriorityListSuccessPage() {
  const params = useParams();
  const studentId = params.id as string;

  const [data, setData] = useState<PriorityListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setError('ID do estudante não fornecido');
      setLoading(false);
      return;
    }

    // Fetch student data to show course info
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/students/${studentId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Estudante não encontrado');
          } else {
            setError('Erro ao carregar dados');
          }
          setLoading(false);
          return;
        }

        const studentData = await response.json();
        
        if (!studentData.priority_list || !studentData.priority_list_course_id) {
          setError('Este estudante não está na lista de prioridade');
          setLoading(false);
          return;
        }

        // Fetch course data
        const courseResponse = await fetch(`/api/courses/${studentData.priority_list_course_id}`);
        if (!courseResponse.ok) {
          setError('Curso não encontrado');
          setLoading(false);
          return;
        }

        const courseData = await courseResponse.json();
        
        setData({
          student_id: studentId,
          course: {
            id: courseData.id,
            grupo_repense: courseData.grupo_repense,
            modelo: courseData.modelo,
            horario: courseData.horario,
          },
          priority_list_added_at: studentData.priority_list_added_at || new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Erro ao conectar com o servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#c92041] mb-4"></div>
          <p className="text-gray-600">Carregando confirmação...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Erro</h2>
            <p className="text-gray-600">{error || 'Dados não encontrados'}</p>
          </div>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-[#c92041] text-white rounded-lg hover:bg-[#a01a33] transition-colors"
          >
            Voltar ao Início
          </a>
        </div>
      </div>
    );
  }

  const addedDate = new Date(data.priority_list_added_at);
  const formattedDate = addedDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Header */}
      <header className="bg-black text-white py-4 mb-8">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <img src="/logored.png" alt="Logo" className="h-12" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 max-w-2xl">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Você foi adicionado à Lista de Prioridade!</h1>
          <p className="text-gray-600">Entraremos em contato quando novas grupos estiverem disponíveis</p>
        </div>

        {/* Confirmation Card */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden">
          {/* Card Header */}
          <div className="bg-blue-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Lista de Prioridade</h2>
                <p className="text-sm text-blue-100 mt-1">PG Repense</p>
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 space-y-6">
            {/* Course Info */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Curso de Interesse</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {grupoLabels[data.course.grupo_repense] || data.course.grupo_repense} - {modeloLabels[data.course.modelo] || data.course.modelo}
                  </p>
                </div>
                {data.course.horario && (
                  <div>
                    <p className="text-base text-gray-700">
                      Horário: {data.course.horario}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Priority List Details */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Detalhes</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Data da Adição:</span>
                  <p className="text-base text-gray-900">{formattedDate}</p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Próximos Passos</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Você receberá uma notificação quando novas grupos abrirem</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Entraremos em contato via WhatsApp ou email</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Você terá prioridade nas novas vagas disponíveis</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Card Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Continue acompanhando a Red 👋🏼</span>
              <span>{new Date().getFullYear()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/"
            className="px-6 py-3 bg-[#c92041] text-white rounded-lg hover:bg-[#a01a33] transition-colors text-center font-medium"
          >
            Voltar ao Início
          </a>
          <a
            href="/register/verify"
            className="px-6 py-3 bg-white text-[#c92041] border-2 border-[#c92041] rounded-lg hover:bg-red-50 transition-colors text-center font-medium"
          >
            Fazer Nova Inscrição
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">© Igreja Red 2026. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
