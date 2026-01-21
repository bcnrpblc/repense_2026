'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, Button } from '@/app/components/ui';
import toast from 'react-hot-toast';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Student {
  studentId: string;
  nome: string;
  email: string | null;
  telefone: string;
  attendance: {
    presente: boolean;
    observacao: string | null;
  } | null;
}

interface ActiveSession {
  id: string;
  numero_sessao: number;
  data_sessao: string;
  relatorio: string | null;
  class: {
    id: string;
    grupo_repense: string;
    modelo: string;
    horario: string | null;
    cidade: string;
    numero_sessoes: number;
    capacidade: number;
    numero_inscritos: number;
  };
  students: Student[];
  attendanceCount: number;
  totalStudents: number;
}

interface AttendanceRecord {
  studentId: string;
  presente: boolean;
  observacao: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ============================================================================
// ICONS
// ============================================================================

const ChevronLeftIcon = () => (
  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// ============================================================================
// STUDENT ATTENDANCE ROW COMPONENT
// ============================================================================

interface StudentRowProps {
  student: Student;
  attendance: AttendanceRecord;
  onChange: (studentId: string, field: 'presente' | 'observacao', value: boolean | string) => void;
}

function StudentRow({ student, attendance, onChange }: StudentRowProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl transition-colors ${
      attendance.presente ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
    }`}>
      {/* Student Info & Checkbox */}
      <div className="flex items-center gap-4 flex-1">
        <label className="relative flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={attendance.presente}
            onChange={(e) => onChange(student.studentId, 'presente', e.target.checked)}
            className="sr-only peer"
          />
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            attendance.presente 
              ? 'bg-green-600 text-white' 
              : 'bg-white border-2 border-gray-300'
          }`}>
            {attendance.presente && <CheckIcon />}
          </div>
        </label>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{student.nome}</p>
          {student.email && (
            <p className="text-sm text-gray-500 truncate">{student.email}</p>
          )}
        </div>
      </div>

      {/* Observation Input */}
      <div className="sm:w-64">
        <input
          type="text"
          value={attendance.observacao}
          onChange={(e) => onChange(student.studentId, 'observacao', e.target.value)}
          placeholder="Observação (opcional)"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}

// ============================================================================
// SESSION PAGE
// ============================================================================

export default function TeacherSessionPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const { token } = useAuth({ requiredRole: 'teacher' });

  const [session, setSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [relatorio, setRelatorio] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [finalizingSession, setFinalizingSession] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch or create active session
  const fetchActiveSession = useCallback(async () => {
    if (!token) return;

    try {
      // First check if there's an active session
      const activeResponse = await fetch('/api/teacher/sessions/active', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!activeResponse.ok) throw new Error('Failed to fetch active session');

      const activeData = await activeResponse.json();

      if (activeData.session && activeData.session.class.id === classId) {
        // Active session exists for this class
        setSession(activeData.session);
        
        // Initialize attendance records from existing data
        const records: Record<string, AttendanceRecord> = {};
        activeData.session.students.forEach((student: Student) => {
          records[student.studentId] = {
            studentId: student.studentId,
            presente: student.attendance?.presente ?? true,
            observacao: student.attendance?.observacao ?? '',
          };
        });
        setAttendanceRecords(records);
        setRelatorio(activeData.session.relatorio || '');
      } else if (activeData.session) {
        // Active session exists but for a different class
        toast.error('Você tem uma sessão ativa em outra turma');
        router.push(`/teacher/classes/${activeData.session.class.id}/session`);
        return;
      } else {
        // No active session - create one
        const createResponse = await fetch('/api/teacher/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ classId }),
        });

        const createData = await createResponse.json();

        if (!createResponse.ok) {
          toast.error(createData.error || 'Erro ao criar sessão');
          router.push('/teacher/dashboard');
          return;
        }

        // Fetch the newly created session
        const newActiveResponse = await fetch('/api/teacher/sessions/active', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const newActiveData = await newActiveResponse.json();
        
        setSession(newActiveData.session);

        // Initialize attendance records (all present by default)
        const records: Record<string, AttendanceRecord> = {};
        newActiveData.session.students.forEach((student: Student) => {
          records[student.studentId] = {
            studentId: student.studentId,
            presente: true,
            observacao: '',
          };
        });
        setAttendanceRecords(records);

        toast.success(`Sessão #${newActiveData.session.numero_sessao} iniciada!`);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      toast.error('Erro ao carregar sessão');
    } finally {
      setLoading(false);
    }
  }, [token, classId, router]);

  useEffect(() => {
    fetchActiveSession();
  }, [fetchActiveSession]);

  // Handle attendance change
  const handleAttendanceChange = (
    studentId: string, 
    field: 'presente' | 'observacao', 
    value: boolean | string
  ) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    const newRecords: Record<string, AttendanceRecord> = {};
    Object.keys(attendanceRecords).forEach((studentId) => {
      newRecords[studentId] = {
        ...attendanceRecords[studentId],
        presente: true,
      };
    });
    setAttendanceRecords(newRecords);
    setHasUnsavedChanges(true);
  };

  // Save attendance
  const handleSaveAttendance = async (): Promise<boolean> => {
    if (!token || !session) return false;

    setSavingAttendance(true);
    try {
      const records = Object.values(attendanceRecords);

      const response = await fetch(`/api/teacher/sessions/${session.id}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ attendanceRecords: records }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao salvar presenças');
        return false;
      }

      toast.success(`Presenças salvas! ${data.stats.presentes}/${data.stats.total} presentes`);
      setHasUnsavedChanges(false);
      
      // Refresh session data to get updated attendance records from DB
      // This ensures isCheckInCompleted() works correctly after saving
      if (session) {
        try {
          const activeResponse = await fetch('/api/teacher/sessions/active', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (activeResponse.ok) {
            const activeData = await activeResponse.json();
            if (activeData.session && activeData.session.class.id === classId) {
              setSession(activeData.session);
              // Update attendanceRecords to match session data
              const records: Record<string, AttendanceRecord> = {};
              activeData.session.students.forEach((student: Student) => {
                records[student.studentId] = {
                  studentId: student.studentId,
                  presente: student.attendance?.presente ?? true,
                  observacao: student.attendance?.observacao ?? '',
                };
              });
              setAttendanceRecords(records);
            }
          }
        } catch (refreshError) {
          console.error('Error refreshing session after save:', refreshError);
          // Don't fail the save if refresh fails
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Erro ao salvar presenças');
      return false;
    } finally {
      setSavingAttendance(false);
    }
  };

  // Check if check-in is completed (all students have attendance records)
  const isCheckInCompleted = () => {
    if (!session || session.students.length === 0) {
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:312',message:'isCheckInCompleted: no session or students',data:{hasSession:!!session,studentsLength:session?.students.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      }
      // #endregion
      return false;
    }
    
    // Check if all students have attendance records
    // After saving, records are in session.students[].attendance
    // But we also need to check local state for unsaved changes
    const studentChecks = session.students.map((student) => {
      // First check if it's in session data (saved to DB)
      const hasSavedAttendance = student.attendance !== null;
      
      // Then check if it's in local state (not yet saved)
      const record = attendanceRecords[student.studentId];
      const hasLocalAttendance = record !== undefined;
      
      return {
        studentId: student.studentId,
        nome: student.nome,
        hasSavedAttendance,
        hasLocalAttendance,
        hasAttendance: hasSavedAttendance || hasLocalAttendance,
      };
    });
    
    const allStudentsHaveAttendance = studentChecks.every((check) => check.hasAttendance);
    
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:312',message:'isCheckInCompleted check',data:{allStudentsHaveAttendance,studentCount:session.students.length,attendanceRecordsCount:Object.keys(attendanceRecords).length,studentChecks},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    }
    // #endregion
    
    return allStudentsHaveAttendance;
  };

  // Finalize session
  const handleFinalizeSession = async () => {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:331',message:'handleFinalizeSession called',data:{hasToken:!!token,hasSession:!!session,hasUnsavedChanges,attendanceRecordsCount:Object.keys(attendanceRecords).length,enrolledStudentsCount:session?.students.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    }
    // #endregion
    
    if (!token || !session) {
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:332',message:'Early return: missing token or session',data:{hasToken:!!token,hasSession:!!session},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      }
      // #endregion
      return;
    }

    // First save attendance if there are unsaved changes.
    // Se salvar presenças falhar, não finaliza a sessão.
    if (hasUnsavedChanges) {
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:336',message:'Saving attendance before finalize',data:{hasUnsavedChanges},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      }
      // #endregion
      const saved = await handleSaveAttendance();
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:338',message:'handleSaveAttendance result',data:{saved},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      }
      // #endregion
      if (!saved) {
        // #region agent log
        if (typeof window !== 'undefined') {
          fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:339',message:'Early return: save attendance failed',data:{saved},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        }
        // #endregion
        return;
      }
      // Wait a bit for state to update, then re-check
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Verify check-in is completed
    const checkInDone = isCheckInCompleted();
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:346',message:'Check-in completion check',data:{checkInDone,attendanceRecordsCount:Object.keys(attendanceRecords).length,enrolledStudentsCount:session?.students.length,attendanceRecords:Object.keys(attendanceRecords),enrolledStudentIds:session?.students.map(s=>s.studentId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    }
    // #endregion
    if (!checkInDone) {
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:348',message:'Check-in not completed, showing error',data:{checkInDone},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      }
      // #endregion
      toast.error('Você precisa registrar a presença de todos os alunos antes de finalizar a sessão');
      return;
    }

    setFinalizingSession(true);
    try {
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:447',message:'Starting finalize API call',data:{sessionId:session.id,relatorio:relatorio,relatorioTrimmed:relatorio?(relatorio.trim()||null):null,relatorioType:typeof relatorio},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      }
      // #endregion
      
      const response = await fetch(`/api/teacher/sessions/${session.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          relatorio: (relatorio && relatorio.trim()) ? relatorio.trim() : null,
        }),
      });

      const data = await response.json();

      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:365',message:'Finalize API response',data:{ok:response.ok,status:response.status,error:data.error,code:data.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      }
      // #endregion

      if (!response.ok) {
        if (data.code === 'CHECK_IN_REQUIRED') {
          toast.error('Você precisa registrar a presença de todos os alunos antes de finalizar a sessão');
        } else {
          toast.error(data.error || 'Erro ao finalizar sessão');
        }
        return;
      }

      toast.success('Sessão finalizada com sucesso!');
      router.push('/teacher/dashboard');
    } catch (error) {
      console.error('Error finalizing session:', error);
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:378',message:'Error finalizing session',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      }
      // #endregion
      toast.error('Erro ao finalizar sessão');
    } finally {
      setFinalizingSession(false);
    }
  };

  // Calculate stats
  const presentCount = Object.values(attendanceRecords).filter((r) => r.presente).length;
  const totalCount = Object.keys(attendanceRecords).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Sessão não encontrada</p>
        <Link href="/teacher/dashboard" className="mt-4 text-blue-600 hover:underline">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/teacher/dashboard"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeftIcon />
        Voltar ao Dashboard
      </Link>

      {/* Session Header */}
      <Card className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/20">
                {session.class.grupo_repense}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/20">
                {session.class.modelo}
              </span>
            </div>
            <h1 className="text-xl font-bold">
              {session.class.horario || 'Sessão em Andamento'}
            </h1>
            <p className="text-blue-100">
              Sessão #{session.numero_sessao} • {formatDate(session.data_sessao)}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
              <p className="text-2xl font-bold">{presentCount}/{totalCount}</p>
              <p className="text-xs text-blue-100">Presentes</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Attendance Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Lista de Presença
          </h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkAllPresent}
            >
              Marcar Todos Presentes
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAttendance}
              disabled={savingAttendance || !hasUnsavedChanges}
            >
              {savingAttendance ? 'Salvando...' : 'Salvar Presenças'}
            </Button>
          </div>
        </div>

        {/* Students List */}
        {session.students.length === 0 ? (
          <Card className="text-center py-8">
            <UserIcon />
            <p className="mt-4 text-gray-500">Nenhum aluno inscrito nesta turma</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {session.students.map((student) => (
              <StudentRow
                key={student.studentId}
                student={student}
                attendance={attendanceRecords[student.studentId]}
                onChange={handleAttendanceChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Report Section */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Relatório da Aula (Opcional)
        </h2>
        <textarea
          value={relatorio}
          onChange={(e) => setRelatorio(e.target.value)}
          placeholder="Descreva o que foi trabalhado na aula, observações importantes, etc... (opcional)"
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={6}
          style={{ minHeight: '150px' }}
        />
        <p className="mt-2 text-sm text-gray-500">
          O relatório é opcional. Você pode adicionar observações sobre a sessão se desejar.
        </p>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end">
        <Button
          variant="secondary"
          onClick={() => router.push('/teacher/dashboard')}
        >
          Salvar e Sair (continuar depois)
        </Button>
        <Button
          variant="primary"
          onClick={(e) => {
            // #region agent log
            if (typeof window !== 'undefined') {
              fetch('http://127.0.0.1:7249/ingest/968788e1-fcc3-43a8-9503-ceefa9c559f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/teacher/classes/[id]/session/page.tsx:523',message:'Finalize button clicked',data:{finalizingSession,isCheckInCompleted:isCheckInCompleted(),buttonDisabled:finalizingSession || !isCheckInCompleted()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            }
            // #endregion
            if (!finalizingSession && isCheckInCompleted()) {
              handleFinalizeSession();
            }
          }}
          disabled={finalizingSession || !isCheckInCompleted()}
        >
          {finalizingSession ? 'Finalizando...' : 'Finalizar Sessão'}
        </Button>
      </div>

      {/* Unsaved changes warning */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800 shadow-lg">
          Você tem alterações não salvas
        </div>
      )}
    </div>
  );
}
