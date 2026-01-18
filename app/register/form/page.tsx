'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import InputMask from 'react-input-mask';
import { useRouter } from 'next/navigation';
import { registerSchema, type RegisterFormData } from '@/lib/validations/register';
import { formatCPF } from '@/lib/utils/cpf';
import { formatPhone } from '@/lib/utils/phone';
import { isoDateToBrazilian } from '@/lib/utils/date';
import { formatCourseSchedule, formatDayOfWeek, formatMonth, formatTime } from '@/lib/date-formatters';
import AfternoonCourseWarning from '@/components/AfternoonCourseWarning';
import { GrupoRepense, ModeloCurso } from '@prisma/client';

interface Course {
  id: string;
  grupo_repense: GrupoRepense;
  modelo: ModeloCurso;
  capacidade: number;
  numero_inscritos: number;
  eh_ativo: boolean;
  eh_mulheres: boolean;
  eh_itu: boolean;
  data_inicio: string | null;
  horario: string | null;
}

type GroupedCoursesByCity = {
  indaiatuba: Record<GrupoRepense, Course[]>;
  itu: Record<GrupoRepense, Course[]>;
};

const grupoLabels: Record<GrupoRepense, string> = {
  Igreja: 'Igreja',
  Espiritualidade: 'Espiritualidade',
  Evangelho: 'Evangelho',
};

const modeloLabels: Record<ModeloCurso, string> = {
  online: 'Online',
  presencial: 'Presencial',
};

export default function RegisterFormPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [groupedCourses, setGroupedCourses] = useState<GroupedCoursesByCity>({
    indaiatuba: {
      Igreja: [],
      Espiritualidade: [],
      Evangelho: [],
    },
    itu: {
      Igreja: [],
      Espiritualidade: [],
      Evangelho: [],
    },
  });
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [warningShownFor, setWarningShownFor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const watchedValues = watch();

  // Fetch courses when step 2 is shown or when genero changes
  useEffect(() => {
    // Only fetch courses when we're on step 2 or about to go to step 2
    if (step < 2) {
      return;
    }

    const fetchCourses = async () => {
      setFetchingCourses(true);
      try {
        const genero = watchedValues.genero;
        const url = genero ? `/api/courses?genero=${encodeURIComponent(genero)}` : '/api/courses';
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          
          // API returns grouped by city structure
          setGroupedCourses({
            indaiatuba: data.indaiatuba || { Igreja: [], Espiritualidade: [], Evangelho: [] },
            itu: data.itu || { Igreja: [], Espiritualidade: [], Evangelho: [] },
          });
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setFetchingCourses(false);
      }
    };

    fetchCourses();
  }, [step, watchedValues.genero]);

  // Flatten all courses for finding selected course
  const allCourses: Course[] = [
    ...Object.values(groupedCourses.indaiatuba).flat(),
    ...Object.values(groupedCourses.itu).flat(),
  ];

  const handleNext = async () => {
    if (step === 1) {
      const isValid = await trigger(['nome', 'cpf', 'telefone']);
      if (isValid) {
        setStep(2);
      }
    } else if (step === 2) {
      const isValid = await trigger(['course_id']);
      if (isValid) {
        const selectedCourse = allCourses.find((c) => c.id === watchedValues.course_id);
        
        // Check if selected course is 16:30 and warning hasn't been shown
        if (selectedCourse && selectedCourse.horario === '16:30' && warningShownFor !== selectedCourse.id) {
          setPendingCourseId(selectedCourse.id);
          setShowWarning(true);
          return;
        }
        
        setStep(3);
      }
    }
  };

  const handleWarningContinue = () => {
    if (pendingCourseId) {
      setWarningShownFor(pendingCourseId);
    }
    setShowWarning(false);
    setPendingCourseId(null);
    setStep(3);
  };

  const handleWarningCancel = () => {
    setShowWarning(false);
    setPendingCourseId(null);
    setValue('course_id', '');
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setSubmitError(null);

    try {
      // Transform form data to API format
      const requestBody = {
        student: {
          nome: data.nome,
          cpf: data.cpf,
          telefone: data.telefone,
          email: data.email,
          genero: data.genero,
          estado_civil: data.estado_civil,
          nascimento: data.nascimento,
        },
        course_id: data.course_id,
      };

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubmitError(result.error || 'Erro ao realizar inscrição');
        setLoading(false);
        return;
      }

      // Redirect to success page
      if (result.enrollment_id) {
        router.push(`/register/success/${result.enrollment_id}`);
      } else {
        setSubmitError('Erro ao obter ID da inscrição');
        setLoading(false);
      }
    } catch (error) {
      setSubmitError('Erro ao conectar com o servidor');
      setLoading(false);
    }
  };

  const selectedCourse = allCourses.find((c) => c.id === watchedValues.course_id);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-black text-white py-4">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <img src="/logored.png" alt="Logo" className="h-12" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">inscrição Online</h1>
          <p className="text-gray-600">Preencha os dados abaixo para realizar sua inscrição</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step >= stepNum
                        ? 'bg-[#c92041] text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step > stepNum ? '✓' : stepNum}
                  </div>
                  <div className="mt-2 text-sm text-gray-600 text-center">
                    {stepNum === 1 && 'Dados Pessoais'}
                    {stepNum === 2 && 'Seleção de Curso'}
                    {stepNum === 3 && 'Revisão'}
                  </div>
                </div>
                {stepNum < 3 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      step > stepNum ? 'bg-[#c92041]' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Dados Pessoais</h2>

              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('nome')}
                  type="text"
                  id="nome"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#c92041] focus:border-transparent ${
                    errors.nome ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Digite seu nome completo"
                />
                {errors.nome && (
                  <p className="mt-1 text-sm text-red-500">{errors.nome.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-2">
                  CPF <span className="text-red-500">*</span>
                </label>
                <InputMask
                  mask="999.999.999-99"
                  value={watchedValues.cpf || ''}
                  onChange={(e) => {
                    setValue('cpf', e.target.value, { shouldValidate: true });
                  }}
                >
                  {(inputProps: any) => (
                    <input
                      {...inputProps}
                      id="cpf"
                      type="text"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#c92041] focus:border-transparent ${
                        errors.cpf ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="000.000.000-00"
                    />
                  )}
                </InputMask>
                {errors.cpf && (
                  <p className="mt-1 text-sm text-red-500">{errors.cpf.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <InputMask
                  mask="(99) 99999-9999"
                  value={watchedValues.telefone || ''}
                  onChange={(e) => {
                    setValue('telefone', e.target.value, { shouldValidate: true });
                  }}
                >
                  {(inputProps: any) => (
                    <input
                      {...inputProps}
                      id="telefone"
                      type="tel"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#c92041] focus:border-transparent ${
                        errors.telefone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="(00) 00000-0000"
                    />
                  )}
                </InputMask>
                {errors.telefone && (
                  <p className="mt-1 text-sm text-red-500">{errors.telefone.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#c92041] focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="seu@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="genero" className="block text-sm font-medium text-gray-700 mb-2">
                    Gênero
                  </label>
                  <select
                    {...register('genero')}
                    id="genero"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c92041] focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="estado_civil" className="block text-sm font-medium text-gray-700 mb-2">
                    Estado Civil
                  </label>
                  <select
                    {...register('estado_civil')}
                    id="estado_civil"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c92041] focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    <option value="Solteiro">Solteiro</option>
                    <option value="Casado">Casado</option>
                    <option value="Divorciado">Divorciado</option>
                    <option value="Viúvo">Viúvo</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="nascimento" className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Nascimento
                </label>
                <InputMask
                  mask="99-99-9999"
                  value={watchedValues.nascimento || ''}
                  onChange={(e) => {
                    setValue('nascimento', e.target.value, { shouldValidate: true });
                  }}
                  placeholder="dd-MM-yyyy"
                >
                  {(inputProps: any) => (
                    <input
                      {...inputProps}
                      id="nascimento"
                      type="text"
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#c92041] focus:border-transparent ${
                        errors.nascimento ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="dd-MM-yyyy (ex: 25-12-1990)"
                    />
                  )}
                </InputMask>
                {errors.nascimento && (
                  <p className="mt-1 text-sm text-red-500">{errors.nascimento.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Course Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Seleção do PG Repense</h2>

              {fetchingCourses ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c92041]"></div>
                  <p className="mt-4 text-gray-600">Carregando opções...</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Opções Repense Indaiatuba */}
                  <div className="space-y-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-gray-300">
                      Opções Repense Indaiatuba
                    </h3>
                    {Object.entries(groupedCourses.indaiatuba).map(([grupo, grupoCourses]) => (
                      grupoCourses.length > 0 && (
                        <div key={`indaiatuba-${grupo}`}>
                          <h4 className="text-xl font-semibold text-gray-900 mb-4">
                            {grupoLabels[grupo as GrupoRepense]}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {grupoCourses.map((course) => {
                              const isFull = course.numero_inscritos >= course.capacidade;
                              const isSelected = watchedValues.course_id === course.id;
                              const vagasDisponiveis = course.capacidade - course.numero_inscritos;

                              return (
                                <div
                                  key={course.id}
                                  onClick={() => {
                                    if (!isFull) {
                                      setValue('course_id', course.id, { shouldValidate: true });
                                    }
                                  }}
                                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'border-[#c92041] bg-red-50'
                                      : isFull
                                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                      : 'border-gray-200 hover:border-[#c92041] hover:bg-red-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="font-semibold text-gray-900">
                                        {course.data_inicio && course.horario
                                          ? formatCourseSchedule(course.modelo, course.data_inicio, course.horario)
                                          : modeloLabels[course.modelo]}
                                      </div>
                                      {course.eh_mulheres && (
                                        <div className="mt-2 text-sm text-purple-600 font-medium">
                                          Esse Repense é exclusivo para mulheres
                                        </div>
                                      )}
                                      <div className="text-sm text-gray-600 mt-1">
                                        Capacidade: {course.capacidade}
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="w-6 h-6 bg-[#c92041] rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-2">
                                    {isFull ? (
                                      <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded">
                                        Curso lotado
                                      </span>
                                    ) : (
                                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
                                        {vagasDisponiveis} {vagasDisponiveis === 1 ? 'vaga disponível' : 'vagas disponíveis'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    ))}
                  </div>

                  {/* Opções Repense Itu */}
                  <div className="space-y-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-gray-300">
                      Opções Repense Itu
                    </h3>
                    {Object.entries(groupedCourses.itu).map(([grupo, grupoCourses]) => (
                      grupoCourses.length > 0 && (
                        <div key={`itu-${grupo}`}>
                          <h4 className="text-xl font-semibold text-gray-900 mb-4">
                            {grupoLabels[grupo as GrupoRepense]}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {grupoCourses.map((course) => {
                              const isFull = course.numero_inscritos >= course.capacidade;
                              const isSelected = watchedValues.course_id === course.id;
                              const vagasDisponiveis = course.capacidade - course.numero_inscritos;

                              return (
                                <div
                                  key={course.id}
                                  onClick={() => {
                                    if (!isFull) {
                                      setValue('course_id', course.id, { shouldValidate: true });
                                    }
                                  }}
                                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'border-[#c92041] bg-red-50'
                                      : isFull
                                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                      : 'border-gray-200 hover:border-[#c92041] hover:bg-red-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="font-semibold text-gray-900">
                                        {course.data_inicio && course.horario
                                          ? formatCourseSchedule(course.modelo, course.data_inicio, course.horario)
                                          : modeloLabels[course.modelo]}
                                      </div>
                                      {course.eh_mulheres && (
                                        <div className="mt-2 text-sm text-purple-600 font-medium">
                                          Esse Repense é exclusivo para mulheres
                                        </div>
                                      )}
                                      <div className="text-sm text-gray-600 mt-1">
                                        Capacidade: {course.capacidade}
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="w-6 h-6 bg-[#c92041] rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-2">
                                    {isFull ? (
                                      <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded">
                                        Curso lotado
                                      </span>
                                    ) : (
                                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
                                        {vagasDisponiveis} {vagasDisponiveis === 1 ? 'vaga disponível' : 'vagas disponíveis'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {errors.course_id && (
                <p className="text-sm text-red-500 mt-2">{errors.course_id.message}</p>
              )}
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Revisão dos Dados</h2>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Nome:</span>
                      <p className="font-medium text-gray-900">{watchedValues.nome}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">CPF:</span>
                      <p className="font-medium text-gray-900">{formatCPF(watchedValues.cpf || '')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Telefone:</span>
                      <p className="font-medium text-gray-900">{watchedValues.telefone}</p>
                    </div>
                    {watchedValues.email && (
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <p className="font-medium text-gray-900">{watchedValues.email}</p>
                      </div>
                    )}
                    {watchedValues.genero && (
                      <div>
                        <span className="text-gray-600">Gênero:</span>
                        <p className="font-medium text-gray-900">{watchedValues.genero}</p>
                      </div>
                    )}
                    {watchedValues.estado_civil && (
                      <div>
                        <span className="text-gray-600">Estado Civil:</span>
                        <p className="font-medium text-gray-900">{watchedValues.estado_civil}</p>
                      </div>
                    )}
                    {watchedValues.nascimento && (
                      <div>
                        <span className="text-gray-600">Data de Nascimento:</span>
                        <p className="font-medium text-gray-900">
                          {watchedValues.nascimento}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedCourse && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Curso Selecionado</h3>
                    <div className="text-sm space-y-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {grupoLabels[selectedCourse.grupo_repense]} - {modeloLabels[selectedCourse.modelo]}
                        </p>
                      </div>
                      {selectedCourse.data_inicio && selectedCourse.horario && (
                        <div>
                          <p className="font-medium text-gray-900">
                            {(() => {
                              const dateObj = new Date(selectedCourse.data_inicio);
                              const dayOfWeek = formatDayOfWeek(dateObj);
                              const day = dateObj.getDate();
                              const month = formatMonth(dateObj);
                              const time = formatTime(selectedCourse.horario);
                              return `${dayOfWeek} dia ${day} de ${month} às ${time}`;
                            })()}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600">
                          {selectedCourse.capacidade - selectedCourse.numero_inscritos}/{selectedCourse.capacidade} vagas
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{submitError}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                step === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Voltar
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-[#c92041] text-white rounded-lg font-medium hover:bg-[#a01a33] transition-colors"
              >
                Próximo
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#c92041] text-white rounded-lg font-medium hover:bg-[#a01a33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {loading ? 'Enviando...' : 'Confirmar inscrição'}
              </button>
            )}
          </div>
        </form>
      </main>

      {/* Afternoon Course Warning Modal */}
      <AfternoonCourseWarning
        isOpen={showWarning}
        onContinue={handleWarningContinue}
        onCancel={handleWarningCancel}
      />

      {/* Footer */}
      <footer className="bg-black text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">© 2026 PG Repense. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
