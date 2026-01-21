'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { Button } from './ui';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ClassOption {
  id: string;
  grupo_repense: string;
  modelo: string;
  horario: string | null;
  eh_itu: boolean;
  capacidade: number;
  numero_inscritos: number;
  teacher?: {
    nome: string;
  } | null;
}

interface TransferStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentId: string;
  studentName: string;
  currentClassId?: string; // Optional - not needed for priority list students
  currentGrupoRepense?: string; // Optional - not needed for priority list students
  isPriorityListStudent?: boolean; // Flag to indicate if this is a priority list student
}

// ============================================================================
// TRANSFER STUDENT MODAL COMPONENT
// ============================================================================

/**
 * Modal component for transferring a student to another class
 */
export function TransferStudentModal({
  isOpen,
  onClose,
  onSuccess,
  studentId,
  studentName,
  currentClassId,
  currentGrupoRepense,
  isPriorityListStudent = false,
}: TransferStudentModalProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch available classes for transfer
  useEffect(() => {
    async function fetchClasses() {
      if (!isOpen) return;
      
      setLoading(true);
      try {
        const token = getAuthToken();
        // For priority list students or to show all courses, fetch all active courses
        // For enrolled students, we can still show all active courses (admin can transfer anywhere)
        const response = await fetch(
          `/api/admin/classes?eh_ativo=true`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.ok) {
          const data = await response.json();
          // Filter out current class (if exists) and classes that are full
          // Only filter current class if this is an enrolled student transfer
          const available = data.classes.filter(
            (c: ClassOption) => {
              // For priority list students, show all active courses
              if (isPriorityListStudent) {
                return c.numero_inscritos < c.capacidade;
              }
              // For enrolled students, exclude current class
              return c.id !== currentClassId && c.numero_inscritos < c.capacidade;
            }
          );
          setClasses(available);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        toast.error('Erro ao carregar turmas');
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, [isOpen, currentClassId, isPriorityListStudent]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedClassId('');
      setShowConfirm(false);
    }
  }, [isOpen]);

  // Handle transfer
  const handleTransfer = async () => {
    if (!selectedClassId) {
      toast.error('Selecione uma turma de destino');
      return;
    }

    setSubmitting(true);
    try {
      const token = getAuthToken();
      
      // For priority list students, use different endpoint
      if (isPriorityListStudent) {
        const response = await fetch(`/api/admin/students/${studentId}/transfer-priority`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newCourseId: selectedClassId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao transferir aluno');
        }

        toast.success('Aluno da lista de prioridade transferido com sucesso!');
        onSuccess();
        onClose();
      } else {
        // For enrolled students, use existing move-student endpoint
        if (!currentClassId) {
          throw new Error('ID da turma atual é necessário para transferência');
        }
        
        const response = await fetch(`/api/admin/classes/${currentClassId}/move-student`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            studentId,
            newClassId: selectedClassId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao transferir aluno');
        }

        toast.success('Aluno transferido com sucesso!');
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error transferring student:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao transferir aluno');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Transferir Aluno: ${studentName}`}
      size="md"
    >
      {!showConfirm ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {isPriorityListStudent 
              ? 'Selecione o curso para o qual deseja transferir o aluno da lista de prioridade. Todas as turmas ativas com vagas disponíveis são exibidas.'
              : currentGrupoRepense
              ? `Selecione a turma de destino. Todas as turmas ativas com vagas disponíveis são exibidas.`
              : 'Selecione a turma de destino. Todas as turmas ativas com vagas disponíveis são exibidas.'
            }
          </p>

          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Carregando turmas...</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="py-8 text-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">Nenhuma turma disponível para transferência</p>
            </div>
          ) : (
            <div className="space-y-2">
              {classes.map((classItem) => (
                <label
                  key={classItem.id}
                  className={`
                    flex items-center justify-between p-4 border rounded-lg cursor-pointer
                    ${selectedClassId === classItem.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="targetClass"
                      value={classItem.id}
                      checked={selectedClassId === classItem.id}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {classItem.grupo_repense} - {classItem.horario || 'Horário não definido'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {classItem.modelo} • {classItem.eh_itu ? 'Itu' : 'Indaiatuba'}
                        {classItem.teacher && ` • Líder ${classItem.teacher.nome}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {classItem.numero_inscritos}/{classItem.capacidade} vagas
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!selectedClassId || loading}
              onClick={() => setShowConfirm(true)}
            >
              Continuar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Confirmation Screen */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-yellow-800">Confirmar Transferência</p>
                <p className="mt-1 text-sm text-yellow-700">
                  O aluno <strong>{studentName}</strong> será transferido para a turma:
                </p>
                <p className="mt-2 text-sm font-medium text-yellow-800">
                  {selectedClass?.grupo_repense} - {selectedClass?.horario || 'Horário não definido'} - {selectedClass?.eh_itu ? 'Itu' : 'Indaiatuba'}
                </p>
                <p className="mt-2 text-sm text-yellow-700">
                  <strong>Atenção:</strong> O progresso do aluno será resetado na nova turma.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowConfirm(false)}
              disabled={submitting}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={submitting}
              onClick={handleTransfer}
            >
              Confirmar Transferência
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
