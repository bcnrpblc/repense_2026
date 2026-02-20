'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/hooks/useAuth';
import { WhatsAppButton } from './WhatsAppButton';
import { TeacherEditStudentModal } from './TeacherEditStudentModal';
import { Button } from './ui';
import toast from 'react-hot-toast';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Student {
  id: string;
  nome: string;
  email: string | null;
  telefone: string;
  faltas: number;
  totalSessoes: number;
}

interface StudentListAccordionProps {
  classId: string;
  isOpen: boolean;
  onToggle: () => void;
}

// ============================================================================
// STUDENT LIST ACCORDION COMPONENT
// ============================================================================

export function StudentListAccordion({
  classId,
  isOpen,
  onToggle,
}: StudentListAccordionProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Fetch students when accordion opens
  useEffect(() => {
    if (isOpen && classId) {
      fetchStudents();
    }
  }, [isOpen, classId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/teacher/classes/${classId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar participantes');
      }

      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Erro ao carregar participantes');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = () => {
    fetchStudents(); // Refresh list after edit
  };

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={onToggle}
        className="w-full mt-4"
      >
        Participantes
      </Button>
    );
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Participantes</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
        >
          Ocultar
        </Button>
      </div>

      {loading ? (
        <div className="py-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Carregando...</p>
        </div>
      ) : students.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          Nenhum aluno matriculado
        </p>
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900">
                  {student.nome}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {student.faltas > 0 ? `${student.faltas} faltas` : 'Sem faltas'}
                  {student.totalSessoes > 0 && ` • ${student.totalSessoes} sessões`}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <WhatsAppButton telefone={student.telefone} size="sm" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingStudent(student)}
                >
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingStudent && (
        <TeacherEditStudentModal
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={handleEditSuccess}
          student={editingStudent}
        />
      )}
    </div>
  );
}
