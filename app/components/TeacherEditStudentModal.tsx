'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import InputMask from 'react-input-mask';
import { Modal } from './Modal';
import { Button, Input } from './ui';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface StudentInfo {
  id: string;
  nome: string;
  email: string | null;
  telefone: string;
}

interface TeacherEditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: StudentInfo;
}

// ============================================================================
// TEACHER EDIT STUDENT MODAL COMPONENT
// ============================================================================

/**
 * Simplified modal for teachers to edit student information
 * Teachers can only edit: nome, telefone, email
 */
export function TeacherEditStudentModal({
  isOpen,
  onClose,
  onSuccess,
  student,
}: TeacherEditStudentModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
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
      });
      setErrors({});
    }
  }, [isOpen, student]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else {
      const cleaned = formData.telefone.replace(/\D/g, '');
      if (cleaned.length < 10 || cleaned.length > 15) {
        newErrors.telefone = 'Telefone deve ter entre 10 e 15 dígitos';
      }
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/teacher/students/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: formData.nome.trim(),
          email: formData.email.trim() || null,
          telefone: formData.telefone.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar participante');
      }

      toast.success('Participante atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar participante');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Participante"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
            Nome *
          </label>
          <Input
            id="nome"
            name="nome"
            type="text"
            value={formData.nome}
            onChange={handleChange}
            placeholder="Nome completo"
            required
            className={errors.nome ? 'border-red-500' : ''}
          />
          {errors.nome && (
            <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
          )}
        </div>

        {/* Telefone */}
        <div>
          <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
            Telefone *
          </label>
          <InputMask
            mask="(99) 99999-9999"
            value={formData.telefone}
            onChange={(e) => {
              const target = e.target as HTMLInputElement;
              setFormData((prev) => ({ ...prev, telefone: target.value }));
              if (errors.telefone) {
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.telefone;
                  return newErrors;
                });
              }
            }}
          >
            {(inputProps: any) => (
              <Input
                {...inputProps}
                id="telefone"
                name="telefone"
                type="tel"
                placeholder="(11) 99999-9999"
                required
                className={errors.telefone ? 'border-red-500' : ''}
              />
            )}
          </InputMask>
          {errors.telefone && (
            <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@exemplo.com"
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
