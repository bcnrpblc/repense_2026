'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button, Card } from '@/app/components/ui';
import { ConfirmModal } from '@/app/components/Modal';
import { CreateClassModal } from '@/app/components/CreateClassModal';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Teacher {
  id: string;
  nome: string;
  email: string;
}

interface ClassItem {
  id: string;
  grupo_repense: string;
  modelo: string;
  capacidade: number;
  numero_inscritos: number;
  eh_ativo: boolean;
  eh_16h: boolean;
  eh_mulheres: boolean;
  cidade: string | null;
  horario: string | null;
  data_inicio: string | null;
  arquivada: boolean;
  final_report: string | null;
  final_report_em: string | null;
  teacher: Teacher | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

function getModeloBadgeColor(modelo: string): string {
  return modelo === 'presencial'
    ? 'bg-green-100 text-green-800'
    : 'bg-blue-100 text-blue-800';
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
}

function isFutureClass(dataInicio: string | null): boolean {
  if (!dataInicio) return false;
  return new Date(dataInicio) > new Date();
}

// ============================================================================
// TOGGLE SWITCH COMPONENT
// ============================================================================

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
  showLabel?: boolean;
}

function ToggleSwitch({ enabled, onChange, disabled = false, showLabel = true }: ToggleSwitchProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange();
        }}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${enabled ? 'bg-primary' : 'bg-gray-300'}
        `}
        role="switch"
        aria-checked={enabled}
        title={enabled ? 'Desativar grupo' : 'Ativar grupo'}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
            transition duration-200 ease-in-out
            ${enabled ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
      {showLabel && (
        <span className={`text-xs font-medium min-w-[45px] ${enabled ? 'text-green-600' : 'text-gray-500'}`}>
          {enabled ? 'Ativa' : 'Inativa'}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// CLASSES PAGE COMPONENT
// ============================================================================

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterGrupo, setFilterGrupo] = useState<string>('all');
  const [filterTeacher, setFilterTeacher] = useState<string>('all');

  // Selection for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchArchiveModal, setShowBatchArchiveModal] = useState(false);
  const [batchArchiving, setBatchArchiving] = useState(false);

  // Fetch classes and teachers
  const fetchData = async () => {
    try {
      const token = getAuthToken();
      
      // Build query params based on filter
      let queryParams = '';
      if (filterStatus === 'archived') {
        queryParams = '?arquivada=true';
      } else if (filterStatus === 'active') {
        queryParams = '?arquivada=false&eh_ativo=true';
      } else if (filterStatus === 'inactive') {
        queryParams = '?arquivada=false&eh_ativo=false';
      } else if (filterStatus === 'future') {
        queryParams = '?arquivada=false&aguardando_inicio=true';
      } else {
        queryParams = '?arquivada=false';
      }
      
      const [classesRes, teachersRes] = await Promise.all([
        fetch(`/api/admin/classes${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/teachers', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.classes);
      }

      if (teachersRes.ok) {
        const data = await teachersRes.json();
        setTeachers(data.teachers);
      }

      // Clear selection when data changes
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  // Toggle class active status
  const toggleClassStatus = async (classItem: ClassItem) => {
    setTogglingId(classItem.id);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/classes/${classItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eh_ativo: !classItem.eh_ativo }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar grupo');
      }

      // Update local state optimistically
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classItem.id ? { ...c, eh_ativo: !c.eh_ativo } : c
        )
      );

      toast.success(
        classItem.eh_ativo ? 'Grupo desativado' : 'Grupo ativado'
      );
    } catch (error) {
      console.error('Error toggling class status:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar grupo');
    } finally {
      setTogglingId(null);
    }
  };

  // Archive a single class
  const archiveClass = async (classItem: ClassItem) => {
    setArchivingId(classItem.id);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/classes/${classItem.id}/archive`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao arquivar grupo');
      }

      toast.success(result.message);
      fetchData();
    } catch (error) {
      console.error('Error archiving class:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao arquivar grupo');
    } finally {
      setArchivingId(null);
    }
  };

  // Batch archive classes
  const batchArchiveClasses = async () => {
    setBatchArchiving(true);
    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/classes/batch/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ classIds: Array.from(selectedIds) }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao arquivar grupos');
      }

      toast.success(result.message);
      setShowBatchArchiveModal(false);
      fetchData();
    } catch (error) {
      console.error('Error batch archiving classes:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao arquivar grupos');
    } finally {
      setBatchArchiving(false);
    }
  };

  // Handle row click - navigate to class details
  const handleRowClick = (classId: string) => {
    router.push(`/admin/classes/${classId}`);
  };

  // Toggle selection
  const toggleSelection = (classId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredClasses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClasses.map((c) => c.id)));
    }
  };

  // Filter classes (local filtering for grupo and teacher)
  const filteredClasses = classes.filter((c) => {
    if (filterGrupo !== 'all' && c.grupo_repense !== filterGrupo) return false;
    if (filterTeacher !== 'all') {
      if (filterTeacher === 'none') {
        if (c.teacher !== null) return false;
      } else if (c.teacher?.id !== filterTeacher) {
        return false;
      }
    }
    return true;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
          <p className="mt-1 text-gray-600">
            Gerencie as grupos do sistema
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && filterStatus !== 'archived' && (
            <Button
              variant="secondary"
              onClick={() => setShowBatchArchiveModal(true)}
            >
              Arquivar ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Criar Grupo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todas</option>
              <option value="active">Ativas</option>
              <option value="inactive">Inativas</option>
              <option value="future">Aguardando</option>
              <option value="archived">Arquivadas</option>
            </select>
          </div>

          {/* Grupo Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grupo
            </label>
            <select
              value={filterGrupo}
              onChange={(e) => setFilterGrupo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos</option>
              <option value="Igreja">Igreja</option>
              <option value="Espiritualidade">Espiritualidade</option>
              <option value="Evangelho">Evangelho</option>
            </select>
          </div>

          {/* Teacher Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facilitador
            </label>
            <select
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos</option>
              <option value="none">Sem Facilitador</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Count */}
          <div className="flex items-end">
            <p className="text-sm text-gray-500 pb-2">
              {filteredClasses.length} grupo{filteredClasses.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </Card>

      {/* Classes Table / Cards */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando grupos...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-gray-500">Nenhum grupo encontrado</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {filterStatus !== 'archived' && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredClasses.length && filteredClasses.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Grupo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Facilitador
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Modelo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Horário
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Cidade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Vagas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClasses.map((classItem) => (
                  <tr
                    key={classItem.id}
                    className={`hover:bg-gray-50 cursor-pointer ${!classItem.eh_ativo ? 'opacity-60' : ''} ${classItem.arquivada ? 'bg-gray-50' : ''}`}
                    onClick={() => handleRowClick(classItem.id)}
                  >
                    {filterStatus !== 'archived' && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(classItem.id)}
                          onChange={() => toggleSelection(classItem.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGrupoBadgeColor(classItem.grupo_repense)}`}>
                          {classItem.grupo_repense}
                        </span>
                        {isFutureClass(classItem.data_inicio) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                            Aguardando início
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {classItem.teacher?.nome || (
                        <span className="text-gray-400 italic">Esperando em Deus</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getModeloBadgeColor(classItem.modelo)}`}>
                        {classItem.modelo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(classItem.data_inicio)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {classItem.horario || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {classItem.cidade || 'Indaiatuba'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {classItem.numero_inscritos}/{classItem.capacidade}
                    </td>
                    <td className="px-4 py-3">
                      {classItem.arquivada ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                          Arquivada
                        </span>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          classItem.eh_ativo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {classItem.eh_ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {!classItem.arquivada && (
                          <>
                            <ToggleSwitch
                              enabled={classItem.eh_ativo}
                              onChange={() => toggleClassStatus(classItem)}
                              disabled={togglingId === classItem.id}
                              showLabel={false}
                            />
                            <Link
                              href={`/admin/classes/${classItem.id}/edit`}
                              className="px-3 py-1 text-xs font-medium text-primary hover:text-primary/80 border border-primary/20 rounded-lg hover:bg-primary/5"
                            >
                              Editar
                            </Link>
                            <button
                              onClick={() => archiveClass(classItem)}
                              disabled={archivingId === classItem.id}
                              className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                              Arquivar
                            </button>
                          </>
                        )}
                        {classItem.arquivada && (
                          <button
                            onClick={() => archiveClass(classItem)}
                            disabled={archivingId === classItem.id}
                            className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                          >
                            Desarquivar
                          </button>
                        )}
                        <Link
                          href={`/admin/classes/${classItem.id}/students`}
                          className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          Participantes
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredClasses.map((classItem) => (
              <Card
                key={classItem.id}
                className={`cursor-pointer ${!classItem.eh_ativo ? 'opacity-60' : ''} ${classItem.arquivada ? 'bg-gray-50' : ''}`}
                onClick={() => handleRowClick(classItem.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGrupoBadgeColor(classItem.grupo_repense)}`}>
                      {classItem.grupo_repense}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getModeloBadgeColor(classItem.modelo)}`}>
                      {classItem.modelo}
                    </span>
                    {isFutureClass(classItem.data_inicio) && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                        Aguardando início
                      </span>
                    )}
                    {classItem.arquivada && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                        Arquivada
                      </span>
                    )}
                  </div>
                  {!classItem.arquivada && (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <ToggleSwitch
                        enabled={classItem.eh_ativo}
                        onChange={() => toggleClassStatus(classItem)}
                        disabled={togglingId === classItem.id}
                        showLabel={false}
                      />
                    </div>
                  )}
                </div>

                <p className="font-medium text-gray-900">
                  {formatDate(classItem.data_inicio)}
                </p>
                <p className="text-sm text-gray-500 mb-1">
                  {classItem.horario || 'Horário não definido'}
                </p>
                <p className="text-sm text-gray-500 mb-3">
                  {classItem.teacher?.nome || (
                    <span className="italic">Esperando em Deus</span>
                  )} • {classItem.cidade || 'Indaiatuba'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {classItem.numero_inscritos}/{classItem.capacidade} vagas ocupadas
                </p>

                <div className="flex gap-6 mt-4" onClick={(e) => e.stopPropagation()}>
                  {!classItem.arquivada ? (
                    <>
                      <Link
                        href={`/admin/classes/${classItem.id}/edit`}
                        className="flex-1 px-3 py-2 text-sm font-medium text-center text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => archiveClass(classItem)}
                        disabled={archivingId === classItem.id}
                        className="flex-1 px-3 py-2 text-sm font-medium text-center text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Arquivar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => archiveClass(classItem)}
                      disabled={archivingId === classItem.id}
                      className="flex-1 px-3 py-2 text-sm font-medium text-center text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                    >
                      Desarquivar
                    </button>
                  )}
                  <Link
                    href={`/admin/classes/${classItem.id}/students`}
                    className="flex-1 px-3 py-2 text-sm font-medium text-center text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Participantes
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create Class Modal */}
      <CreateClassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchData}
      />

      {/* Batch Archive Modal */}
      <ConfirmModal
        isOpen={showBatchArchiveModal}
        onClose={() => setShowBatchArchiveModal(false)}
        onConfirm={batchArchiveClasses}
        title="Arquivar Grupo"
        message={`Deseja arquivar ${selectedIds.size} grupo(s) selecionado(s)? Grupos arquivados não aparecem na listagem principal.`}
        confirmText="Arquivar"
        variant="warning"
        loading={batchArchiving}
      />
    </div>
  );
}
