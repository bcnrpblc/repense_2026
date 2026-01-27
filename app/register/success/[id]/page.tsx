'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { GrupoRepense, ModeloCurso } from '@/types/client-enums';
import { formatDayOfWeek, formatMonth, formatTime } from '@/lib/date-formatters';

interface EnrollmentData {
  id: string;
  student: {
    id: string;
    nome: string;
    email: string | null;
    telefone: string;
    cpf: string;
  };
  course: {
    id: string;
    grupo_repense: GrupoRepense;
    modelo: ModeloCurso;
    link: string | null;
    data_inicio: string | null;
    horario: string | null;
  };
  criado_em: string;
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


export default function SuccessPage() {
  const params = useParams();
  const enrollmentId = params.id as string;

  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const webhookSent = useRef(false);

  useEffect(() => {
    if (!enrollmentId) {
      setError('ID da inscrição não fornecido');
      setLoading(false);
      return;
    }

    const fetchEnrollment = async () => {
      try {
        const response = await fetch(`/api/enrollments/${enrollmentId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Inscrição não encontrada');
          } else {
            setError('Erro ao carregar dados da inscrição');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setEnrollment(data);
      } catch (error) {
        console.error('Error fetching enrollment:', error);
        setError('Erro ao conectar com o servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollment();
  }, [enrollmentId]);

  // Webhook call for WhatsApp confirmation
  useEffect(() => {
    // Only run once when enrollment data is available
    if (!enrollment || webhookSent.current) return;

    const sendWhatsAppConfirmation = async () => {
      try {
        webhookSent.current = true;
        setWebhookStatus('sending');

        const response = await fetch('https://atendimento-n8n.42odzg.easypanel.host/webhook/whatsapp_confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollment_id: enrollment.id,
            student: {
              id: enrollment.student.id,
              nome: enrollment.student.nome,
              telefone: enrollment.student.telefone,
              email: enrollment.student.email || undefined,
              cpf: enrollment.student.cpf,
            },
            course: {
              id: enrollment.course.id,
              grupo_repense: enrollment.course.grupo_repense,
              modelo: enrollment.course.modelo,
              data_inicio: enrollment.course.data_inicio || null,
              horario: enrollment.course.horario || null,
              link: enrollment.course.link || null,
            },
          }),
        });

        if (!response.ok) {
          console.error('Webhook failed:', response.status);
          setWebhookStatus('error');
        } else {
          setWebhookStatus('sent');
        }
      } catch (error) {
        console.error('Error sending WhatsApp confirmation:', error);
        setWebhookStatus('error');
        // Fail silently - don't break the user experience
      }
    };

    sendWhatsAppConfirmation();
  }, [enrollment]);

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

  if (error || !enrollment) {
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
            <p className="text-gray-600">{error || 'Inscrição não encontrada'}</p>
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

  const enrollmentDate = new Date(enrollment.criado_em);
  const formattedDate = enrollmentDate.toLocaleDateString('pt-BR', {
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
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inscrição Confirmada!</h1>
          <p className="text-gray-600">Sua inscrição foi realizada com sucesso</p>
        </div>

        {/* Receipt Card */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden">
          {/* Receipt Header */}
          <div className="bg-[#c92041] text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Confirmação da Inscrição</h2>
                <p className="text-sm text-red-100 mt-1">PG Repense</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-red-100">ID da Inscrição</p>
                <p className="text-lg font-mono font-semibold">{enrollment.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Receipt Body */}
          <div className="p-6 space-y-6">
            {/* Student Info */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Nome do Membro</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Nome:</span>
                  <p className="text-lg font-semibold text-gray-900">{enrollment.student.nome}</p>
                </div>
                {enrollment.student.email && (
                  <div>
                    <span className="text-sm text-gray-600">Email:</span>
                    <p className="text-base text-gray-900">{enrollment.student.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Course Info */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">PG Repense Selecionado</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {grupoLabels[enrollment.course.grupo_repense]} - {modeloLabels[enrollment.course.modelo]}
                  </p>
                </div>
                {enrollment.course.data_inicio && enrollment.course.horario && (
                  <div>
                    <p className="text-base text-gray-900">
                      {(() => {
                        const dateObj = new Date(enrollment.course.data_inicio);
                        const dayOfWeek = formatDayOfWeek(dateObj);
                        const day = dateObj.getDate();
                        const month = formatMonth(dateObj);
                        const time = formatTime(enrollment.course.horario);
                        return `${dayOfWeek} dia ${day} de ${month} às ${time}`;
                      })()}
                    </p>
                  </div>
                )}
                {enrollment.course.link && (
                  <div className="mt-3">
                    <a
                      href={enrollment.course.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#c92041] hover:text-[#a01a33] font-medium text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Ir para o grupo no Whatsapp
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Enrollment Details */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Detalhes da Inscrição</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Data da Inscrição:</span>
                  <p className="text-base text-gray-900">{formattedDate}</p>
                </div>
              </div>
            </div>

            {/* WhatsApp Confirmation Status */}
            {webhookStatus === 'sending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-yellow-800">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>📱 Enviando confirmação...</span>
                </div>
              </div>
            )}

            {webhookStatus === 'sent' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-green-800">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Confirmação enviada via WhatsApp</span>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Próximos Passos</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                {enrollment.student.email && (
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Você receberá uma mensagem de confirmação no Whatsapp</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Você pode acessar o grupo clicando no link acima</span>
                  
                  
                </li>
                {enrollment.course.modelo === 'online' && enrollment.course.link && (
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>É muito importante que você entre no grupo, é por lá que você receberá todas as informações do Repense</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Receipt Footer */}
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

        {/* Print Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir Comprovante
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">© Igreja Red 2026. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          header,
          footer,
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          main {
            max-width: 100% !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
