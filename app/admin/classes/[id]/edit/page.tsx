'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Button, Card } from '@/app/components/ui';
import { DatePicker } from '@/app/components/DatePicker';
import { getAuthToken } from '@/lib/hooks/useAuth';
import { AVAILABLE_CITIES } from '@/lib/constants';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Teacher {
  id: string;
  nome: string;
  email: string;
  eh_ativo: boolean;
}

interface ClassData {
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
  numero_sessoes: number;
  link_whatsapp: string | null;
  arquivada: boolean;
  Teacher: {
    id: string;
    nome: string;
    email: string;
  } | null;
  coLider?: {
    id: string;
    nome: string;
    email: string;
  } | null;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const editClassSchema = z.object({
  capacidade: z.number().int().min(1).max(100),
  eh_ativo: z.boolean(),
  teacher_id: z.string().optional().nullable(),
  co_lider_id: z.string().optional().nullable(),
  link_whatsapp: z.string().url().optional().or(z.literal('')).nullable(),
  horario: z.string().optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  numero_sessoes: z.number().int().min(1).max(20),
  cidade: z.enum(['Indaiatuba', 'Itu']).optional(),
});

type EditClassFormData = z.infer<typeof editClassSchema>;

// ============================================================================
// EDIT CLASS PAGE COMPONENT
// ============================================================================

export default function EditClassPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditClassFormData>({
    resolver: zodResolver(editClassSchema) as Resolver<EditClassFormData>,
  });

  // Fetch class data and teachers
  useEffect(() => {
    async function fetchData() {
      try {
        const token = getAuthToken();
        
        const [classRes, teachersRes] = await Promise.all([
          fetch(`/api/admin/classes/${classId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/admin/teachers', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!classRes.ok) {
          if (classRes.status === 404) {
            toast.error('Grupo não encontrado');
            router.push('/admin/classes');
            return;
          }
          throw new Error('Failed to fetch class');
        }

        const classResult = await classRes.json();
        setClassData(classResult.class);

        if (teachersRes.ok) {
          const teachersResult = await teachersRes.json();
          setTeachers(teachersResult.teachers);
        }

        const dataInicio = classResult.class.data_inicio
          ? String(classResult.class.data_inicio).split('T')[0]
          : '';

        // Use cidade from existing data
        const cidade = classResult.class.cidade || 'Indaiatuba';

        reset({
          capacidade: classResult.class.capacidade,
          eh_ativo: classResult.class.eh_ativo,
          teacher_id: classResult.class.Teacher?.id || '',
          co_lider_id: classResult.class.coLider?.id || '',
          link_whatsapp: classResult.class.link_whatsapp || '',
          horario: classResult.class.horario || '',
          data_inicio: dataInicio,
          numero_sessoes: classResult.class.numero_sessoes,
          cidade: cidade as 'Indaiatuba' | 'Itu',
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar Grupo');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [classId, reset, router]);

  // Handle form submission
  const onSubmit = async (data: EditClassFormData) => {
    try {
      const token = getAuthToken();

      const submitData = {
        capacidade: data.capacidade,
        eh_ativo: data.eh_ativo,
        teacher_id: data.teacher_id || null,
        co_lider_id: data.co_lider_id || null,
        link_whatsapp: data.link_whatsapp || null,
        horario: data.horario || null,
        data_inicio: data.data_inicio?.trim() || null,
        numero_sessoes: data.numero_sessoes,
        cidade: data.cidade,
      };

      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar Grupo');
      }

      toast.success('Grupo atualizado com sucesso!');
      router.push('/admin/classes');

    } catch (error) {
      console.error('Error updating class:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar Grupo');
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando Grupo...</p>
      </div>
    );
  }

  if (!classData) {
    return null;
  }

  // Get active teachers for dropdown
  const activeTeachers = teachers.filter((t) => t.eh_ativo);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Link */}
      <Link
        href="/admin/classes"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar para Grupos
      </Link>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar Grupo</h1>
        <p className="mt-1 text-gray-600">
          Atualize as informações do grupo
        </p>
      </div>

      {/* Read-only Info Card */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Fixas</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Grupo Repense</p>
            <p className="font-medium text-gray-900">{classData.grupo_repense}</p>
          </div>
          <div>
            <p className="text-gray-500">Modelo</p>
            <p className="font-medium text-gray-900 capitalize">{classData.modelo}</p>
          </div>
          <div>
            <p className="text-gray-500">Cidade</p>
            <p className="font-medium text-gray-900">
              {classData.cidade || 'Indaiatuba'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Participantes Inscritos</p>
            <p className="font-medium text-gray-900">{classData.numero_inscritos}</p>
          </div>
          <div>
            <p className="text-gray-500">Somente Mulheres</p>
            <p className="font-medium text-gray-900">{classData.eh_mulheres ? 'Sim' : 'Não'}</p>
          </div>
          <div>
            <p className="text-gray-500">Aula da Tarde (16h)</p>
            <p className="font-medium text-gray-900">{classData.eh_16h ? 'Sim' : 'Não'}</p>
          </div>
        </div>
      </Card>

      {/* Edit Form */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campos Editáveis</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Facilitador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facilitador
            </label>
            <select
              {...register('teacher_id')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Esperando em Deus (sem facilitador)</option>
              {activeTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.nome}
                </option>
              ))}
            </select>
            {errors.teacher_id && (
              <p className="mt-1 text-sm text-red-600">
                {errors.teacher_id.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Selecione &quot;Esperando em Deus&quot; se ainda não há facilitador definido
            </p>
          </div>

          {/* Co-líder (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Co-líder (opcional)
            </label>
            <select
              {...register('co_lider_id')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Nenhum</option>
              {activeTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Capacidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacidade
            </label>
            <input
              type="number"
              {...register('capacidade', { valueAsNumber: true })}
              min={classData.numero_inscritos || 1}
              max={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.capacidade && (
              <p className="mt-1 text-sm text-red-600">
                {errors.capacidade.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Mínimo: {classData.numero_inscritos || 1} (participantes já inscritos)
            </p>
          </div>

          {/* Horário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dia/Horário
            </label>
            <input
              type="text"
              {...register('horario')}
              placeholder="Ex: Terças 19h30"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.horario && (
              <p className="mt-1 text-sm text-red-600">
                {errors.horario.message}
              </p>
            )}
          </div>

          {/* Data Início */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Início
            </label>
            <DatePicker
              value={watch('data_inicio') ?? ''}
              onChange={(iso) => setValue('data_inicio', iso, { shouldValidate: true })}
              placeholder="Selecione a data"
            />
            {errors.data_inicio && (
              <p className="mt-1 text-sm text-red-600">
                {errors.data_inicio.message}
              </p>
            )}
          </div>

          {/* Número de Sessões */}
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
            {errors.numero_sessoes && (
              <p className="mt-1 text-sm text-red-600">
                {errors.numero_sessoes.message}
              </p>
            )}
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
              Link WhatsApp do Grupo
            </label>
            <input
              type="url"
              {...register('link_whatsapp')}
              placeholder="https://chat.whatsapp.com/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.link_whatsapp && (
              <p className="mt-1 text-sm text-red-600">
                {errors.link_whatsapp.message}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('eh_ativo')}
                className="mr-2 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Grupo Ativo</span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Grupos inativos não aparecem para novas inscrições
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Link href="/admin/classes">
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!isDirty}
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
