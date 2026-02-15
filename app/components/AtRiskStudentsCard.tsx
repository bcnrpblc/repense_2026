'use client';

import { useState, useEffect } from 'react';
import { getAuthToken } from '@/lib/hooks/useAuth';
import { Card, Button } from './ui';
import { WhatsAppButton } from './WhatsAppButton';
import { StudentReportModal } from './StudentReportModal';
import toast from 'react-hot-toast';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AtRiskStudent {
  id: string;
  nome: string;
  telefone: string;
  faltas: number;
  classId: string;
  grupoRepense: string;
}

interface AtRiskStudentsCardProps {
  // No props needed - fetches its own data
}

// ============================================================================
// AT-RISK STUDENTS CARD COMPONENT
// ============================================================================

export function AtRiskStudentsCard({}: AtRiskStudentsCardProps) {
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportingStudent, setReportingStudent] = useState<AtRiskStudent | null>(null);

  useEffect(() => {
    fetchAtRiskStudents();
  }, []);

  const fetchAtRiskStudents = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/teacher/at-risk-students', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar alunos em risco');
      }

      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('Error fetching at-risk students:', error);
      toast.error('Erro ao carregar alunos em risco');
    } finally {
      setLoading(false);
    }
  };

  const handleReportSuccess = () => {
    fetchAtRiskStudents(); // Refresh list after report
  };

  // Hide card entirely if no at-risk students
  if (!loading && students.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mb-6 border-yellow-200 bg-yellow-50/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Alunos com 3 ou Mais Faltas
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {students.length} participante{students.length !== 1 ? 's' : ''} precisando de atenção
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Carregando...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={`${student.id}-${student.classId}`}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-yellow-200 hover:border-yellow-300 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{student.nome}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">
                      {student.faltas} faltas
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {student.grupoRepense}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <WhatsAppButton telefone={student.telefone} size="sm" />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setReportingStudent(student)}
                  >
                    Escrever Relatório
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Report Modal */}
      {reportingStudent && (
        <StudentReportModal
          isOpen={!!reportingStudent}
          onClose={() => setReportingStudent(null)}
          onSuccess={handleReportSuccess}
          student={{
            id: reportingStudent.id,
            nome: reportingStudent.nome,
            classId: reportingStudent.classId,
          }}
        />
      )}
    </>
  );
}
