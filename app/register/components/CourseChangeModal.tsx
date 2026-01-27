'use client';

import { formatCourseSchedule } from '@/lib/date-formatters';
import { GrupoRepense, ModeloCurso } from '@/types/client-enums';

interface CourseInfo {
  id: string;
  grupo_repense: GrupoRepense;
  modelo: ModeloCurso;
  horario: string | null;
  data_inicio: Date | string | null;
}

interface CourseChangeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  existingEnrollment: {
    id: string;
    class_id: string;
    status: string;
  };
  currentCourse: CourseInfo;
  newCourse: CourseInfo;
  loading?: boolean;
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

export function CourseChangeModal({
  open,
  onClose,
  onConfirm,
  existingEnrollment,
  currentCourse,
  newCourse,
  loading = false,
}: CourseChangeModalProps) {
  if (!open) return null;

  const currentSchedule = formatCourseSchedule(
    currentCourse.modelo,
    currentCourse.data_inicio,
    currentCourse.horario
  );
  const newSchedule = formatCourseSchedule(
    newCourse.modelo,
    newCourse.data_inicio,
    newCourse.horario
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 z-10">
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Confirmação de Troca de Curso
            </h3>
            <p className="text-sm text-gray-600">
              Você já está matriculado em um curso. Deseja trocar para o novo curso selecionado?
            </p>
          </div>

          {/* Course Comparison */}
          <div className="space-y-4 mb-6">
            {/* Current Course */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Curso Atual</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {grupoLabels[currentCourse.grupo_repense]}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentSchedule}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                    Atual
                  </span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>

            {/* New Course */}
            <div className="bg-red-50 rounded-lg p-4 border-2 border-[#c92041]">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-medium text-[#c92041] uppercase mb-1">Novo Curso</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {grupoLabels[newCourse.grupo_repense]}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {newSchedule}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-block px-2 py-1 bg-[#c92041] text-white text-xs font-medium rounded">
                    Novo
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong>{' '}
                {currentCourse.grupo_repense === newCourse.grupo_repense
                  ? 'Seu progresso no grupo atual será mantido no histórico, mas você será transferido para o novo grupo.'
                  : 'Sua inscrição atual será cancelada e você será inscrito em um novo PG Repense.'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 bg-[#c92041] text-white rounded-lg font-medium hover:bg-[#a01a33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? 'Processando...' : 'Confirmar Troca'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
