'use client';

import { useState, useEffect } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { Button, Input } from './ui';
import { DatePicker } from './DatePicker';
import { getAuthToken } from '@/lib/hooks/useAuth';
import { AVAILABLE_CITIES } from '@/lib/constants';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const createClassSchema = z.object({
  teacher_id: z.string().optional(),
  grupo_repense: z.enum(['Igreja', 'Espiritualidade', 'Evangelho'], {
    message: 'Selecione um grupo',
  }),
  modelo: z.enum(['online', 'presencial'], {
    message: 'Selecione um modelo',
  }),
  capacidade: z.number().int().min(1, 'Mínimo 1').max(100, 'Máximo 100'),
  data_inicio: z.string().optional(),
  horario: z.string().optional(),
  numero_sessoes: z.number().int().min(1).max(20).default(8),
  eh_16h: z.boolean().default(false),
  eh_mulheres: z.boolean().default(false),
  cidade: z.enum(['Indaiatuba', 'Itu'], {
    message: 'Selecione uma cidade',
  }),
  link_whatsapp: z.string().url('URL inválida').optional().or(z.literal('')),
  eh_ativo: z.boolean().default(true),
});

type CreateClassForm = z.infer<typeof createClassSchema>;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Teacher {
  id: string;
  nome: string;
  email: string;
}

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ============================================================================
// CREATE CLASS MODAL COMPONENT
// ============================================================================

/**
 * Modal component for creating a new class
 */
export function CreateClassModal({ isOpen, onClose, onSuccess }: CreateClassModalProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateClassForm>({
    resolver: zodResolver(createClassSchema) as Resolver<CreateClassForm>,
    defaultValues: {
      data_inicio: '',
      numero_sessoes: 8,
      capacidade: 15,
      eh_16h: false,
      eh_mulheres: false,
      cidade: 'Indaiatuba',
      eh_ativo: true,
    },
  });

  // Fetch teachers on mount
  useEffect(() => {
    async function fetchTeachers() {
      try {
        const token = getAuthToken();
        const response = await fetch('/api/admin/teachers', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          // Only show active teachers
          setTeachers(data.teachers.filter((t: any) => t.eh_ativo));
        }
      } catch (error) {
        console.error('Error fetching teachers:', error);
      } finally {
        setLoadingTeachers(false);
      }
    }

    if (isOpen) {
      fetchTeachers();
    }
  }, [isOpen]);

  // Handle form submission
  const onSubmit = async (data: CreateClassForm) => {
    try {
      const token = getAuthToken();

      const payload = {
        ...data,
        teacher_id: data.teacher_id || null,
        link_whatsapp: data.link_whatsapp || null,
        data_inicio: data.data_inicio?.trim() || null,
        horario: data.horario || null,
      };

      const response = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar grupo');
      }

      toast.success('Grupo criado com sucesso!');
      reset();
      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error creating class:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar grupo');
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  // Watch horario to drive automatic eh_16h when necessário
  const selectedHorario = watch('horario');

  const handleHorarioChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const value = e.target.value;
    setValue('horario', value);

    // Ajuste automático da flag "Aula da Tarde (16h)"
    // Regra: se horário for 09:30 ou 16:30, marcar como aula da tarde.
    if (value === '09:30' || value === '16:30') {
      setValue('eh_16h', true);
    } else if (value) {
      setValue('eh_16h', false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar Novo Grupo" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Facilitador Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Facilitador
          </label>
          <select
            {...register('teacher_id')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loadingTeachers}
          >
            <option value="">Selecione um facilitador (opcional)</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.nome} ({teacher.email})
              </option>
            ))}
          </select>
        </div>

        {/* Grupo Repense */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grupo Repense *
          </label>
          <select
            {...register('grupo_repense')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecione</option>
            <option value="Igreja">Igreja</option>
            <option value="Espiritualidade">Espiritualidade</option>
            <option value="Evangelho">Evangelho</option>
          </select>
          {errors.grupo_repense && (
            <p className="mt-1 text-sm text-red-600">{errors.grupo_repense.message}</p>
          )}
        </div>

        {/* Modelo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modelo *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                {...register('modelo')}
                value="presencial"
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              Presencial
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                {...register('modelo')}
                value="online"
                className="mr-2 text-blue-600 focus:ring-blue-500"
              />
              Online
            </label>
          </div>
          {errors.modelo && (
            <p className="mt-1 text-sm text-red-600">{errors.modelo.message}</p>
          )}
        </div>

        {/* Row: Data Início + Horário */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <DatePicker
              value={watch('data_inicio') ?? ''}
              onChange={(iso) => setValue('data_inicio', iso, { shouldValidate: true })}
              placeholder="Selecione a data"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Horário
            </label>
            <select
              {...register('horario')}
              value={selectedHorario || ''}
              onChange={handleHorarioChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione um horário</option>
              <option value="09:30">09h30</option>
              <option value="16:30">16h30</option>
              <option value="18:00">18h00</option>
              <option value="20:00">20h00</option>
            </select>
          </div>
        </div>

        {/* Row: Capacidade + Número de Sessões */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacidade *
            </label>
            <input
              type="number"
              {...register('capacidade', { valueAsNumber: true })}
              min={1}
              max={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.capacidade && (
              <p className="mt-1 text-sm text-red-600">{errors.capacidade.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Sessões
            </label>
            <input
              type="number"
              {...register('numero_sessoes', { valueAsNumber: true })}
              min={1}
              max={20}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('eh_mulheres')}
              className="mr-2 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Somente Mulheres</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('eh_16h')}
              className="mr-2 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Grupo da Tarde (16h)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('eh_ativo')}
              className="mr-2 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Grupo Ativo</span>
          </label>
        </div>

        {/* Cidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cidade <span className="text-red-500">*</span>
          </label>
          <select
            {...register('cidade')}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.cidade ? 'border-red-500' : ''
            }`}
          >
            {AVAILABLE_CITIES.map((city) => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
          {errors.cidade && (
            <p className="mt-1 text-sm text-red-600">{errors.cidade.message}</p>
          )}
        </div>

        {/* Link WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link WhatsApp
          </label>
          <input
            type="url"
            {...register('link_whatsapp')}
            placeholder="https://chat.whatsapp.com/..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.link_whatsapp && (
            <p className="mt-1 text-sm text-red-600">{errors.link_whatsapp.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Criar Grupo
          </Button>
        </div>
      </form>
    </Modal>
  );
}
