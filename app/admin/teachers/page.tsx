'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button, Card } from '@/app/components/ui';
import { CreateTeacherModal } from '@/app/components/CreateTeacherModal';
import { ConfirmModal } from '@/app/components/Modal';
import { WhatsAppButton } from '@/app/components/WhatsAppButton';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Teacher {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  eh_ativo: boolean;
  criado_em: string;
  classCount: number;
  hasActiveClasses: boolean;
}

// ============================================================================
// TEACHERS PAGE COMPONENT
// ============================================================================

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [toggleTarget, setToggleTarget] = useState<Teacher | null>(null);
  const [toggling, setToggling] = useState(false);

  // Fetch teachers
  const fetchTeachers = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch('/api/admin/teachers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Erro ao carregar facilitadores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Handle toggle teacher status
  const handleToggleStatus = async () => {
    if (!toggleTarget) return;

    setToggling(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/teachers/${toggleTarget.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar facilitador');
      }

      toast.success(result.message);
      fetchTeachers();
      setToggleTarget(null);

    } catch (error) {
      console.error('Error toggling teacher status:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar facilitador');
    } finally {
      setToggling(false);
    }
  };

  // Filter teachers by tab
  const filteredTeachers = teachers.filter((t) =>
    activeTab === 'active' ? t.eh_ativo : !t.eh_ativo
  );

  const activeCount = teachers.filter((t) => t.eh_ativo).length;
  const inactiveCount = teachers.filter((t) => !t.eh_ativo).length;

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facilitadores</h1>
          <p className="mt-1 text-gray-600">
            Gestão dos facilitadores
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Adicionar Facilitador
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Ativos ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('inactive')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'inactive'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Inativos ({inactiveCount})
          </button>
        </nav>
      </div>

      {/* Teachers Table / Cards */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando facilitadores...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-gray-500">
            {activeTab === 'active'
              ? 'Nenhum facilitador ativo'
              : 'Nenhum facilitador inativo'
            }
          </p>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Telefone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Grupos
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Atribuição
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {teacher.nome}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {teacher.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {teacher.telefone}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {teacher.classCount}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        teacher.eh_ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {teacher.eh_ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {teacher.hasActiveClasses ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {teacher.classCount} grupo{teacher.classCount !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Sem grupo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <WhatsAppButton telefone={teacher.telefone} size="sm" />
                        <button
                          onClick={() => setToggleTarget(teacher)}
                          className={`px-3 py-1 text-xs font-medium rounded-lg border ${
                            teacher.eh_ativo
                              ? 'text-red-600 border-red-200 hover:bg-red-50'
                              : 'text-green-600 border-green-200 hover:bg-green-50'
                          }`}
                        >
                          {teacher.eh_ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredTeachers.map((teacher) => (
              <Card key={teacher.id}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{teacher.nome}</p>
                    <p className="text-sm text-gray-500">{teacher.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    teacher.eh_ativo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {teacher.eh_ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{teacher.telefone}</p>
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-sm text-gray-500">{teacher.classCount} grupo(s)</p>
                  {teacher.hasActiveClasses ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {teacher.classCount} grupo{teacher.classCount !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Sem grupo
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <WhatsAppButton telefone={teacher.telefone} size="sm" />
                  <button
                    onClick={() => setToggleTarget(teacher)}
                    className={`w-full px-3 py-2 text-sm font-medium rounded-lg border ${
                      teacher.eh_ativo
                        ? 'text-red-600 border-red-200 hover:bg-red-50'
                        : 'text-green-600 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {teacher.eh_ativo ? 'Desativar Facilitador' : 'Ativar Facilitador'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create Teacher Modal */}
      <CreateTeacherModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchTeachers}
      />

      {/* Toggle Confirm Modal */}
      {toggleTarget && (
        <ConfirmModal
          isOpen={!!toggleTarget}
          onClose={() => setToggleTarget(null)}
          onConfirm={handleToggleStatus}
          title={toggleTarget.eh_ativo ? 'Desativar Facilitador' : 'Ativar Facilitador'}
          message={
            toggleTarget.eh_ativo
              ? `Tem certeza que deseja desativar ${toggleTarget.nome}? O facilitador não poderá mais acessar o sistema.`
              : `Tem certeza que deseja ativar ${toggleTarget.nome}? O facilitador poderá acessar o sistema novamente.`
          }
          confirmText={toggleTarget.eh_ativo ? 'Desativar' : 'Ativar'}
          variant={toggleTarget.eh_ativo ? 'danger' : 'info'}
          loading={toggling}
        />
      )}
    </div>
  );
}
