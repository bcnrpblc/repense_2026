'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { Button, Input } from './ui';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface StudentInfo {
  id: string;
  nome: string;
  cpf: string;
  email: string | null;
  telefone: string;
  genero: string | null;
  estado_civil: string | null;
  nascimento: string | null;
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: StudentInfo;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDateForInput(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

// ============================================================================
// EDIT STUDENT MODAL COMPONENT
// ============================================================================

/**
 * Modal component for editing student information
 * CPF is shown but cannot be edited
 */
export function EditStudentModal({
  isOpen,
  onClose,
  onSuccess,
  student,
}: EditStudentModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    genero: '',
    estado_civil: '',
    nascimento: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens or student changes
  useEffect(() => {
    if (isOpen && student) {
      setFormData({
        nome: student.nome || '',
        email: student.email || '',
        telefone: student.telefone || '',
        genero: student.genero || '',
        estado_civil: student.estado_civil || '',
        nascimento: formatDateForInput(student.nascimento),
      });
      setErrors({});
    }
  }, [isOpen, student]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/students/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: formData.nome.trim(),
          email: formData.email.trim() || null,
          telefone: formData.telefone.trim(),
          genero: formData.genero || null,
          estado_civil: formData.estado_civil || null,
          nascimento: formData.nascimento || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar aluno');
      }

      toast.success('Aluno atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar aluno');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Aluno"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* CPF (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CPF
          </label>
          <input
            type="text"
            value={formatCPF(student.cpf)}
            disabled
            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500">CPF não pode ser alterado</p>
        </div>

        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome *
          </label>
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.nome ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Nome completo"
          />
          {errors.nome && (
            <p className="mt-1 text-xs text-red-500">{errors.nome}</p>
          )}
        </div>

        {/* Email and Telefone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="email@exemplo.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone *
            </label>
            <input
              type="tel"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.telefone ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="(11) 99999-9999"
            />
            {errors.telefone && (
              <p className="mt-1 text-xs text-red-500">{errors.telefone}</p>
            )}
          </div>
        </div>

        {/* Gênero and Estado Civil */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gênero
            </label>
            <select
              name="genero"
              value={formData.genero}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado Civil
            </label>
            <select
              name="estado_civil"
              value={formData.estado_civil}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione...</option>
              <option value="Solteiro(a)">Solteiro(a)</option>
              <option value="Casado(a)">Casado(a)</option>
              <option value="Divorciado(a)">Divorciado(a)</option>
              <option value="Viúvo(a)">Viúvo(a)</option>
              <option value="União Estável">União Estável</option>
            </select>
          </div>
        </div>

        {/* Nascimento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Nascimento
          </label>
          <input
            type="date"
            name="nascimento"
            value={formData.nascimento}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
          >
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Modal>
  );
}
