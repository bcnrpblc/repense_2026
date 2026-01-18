'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import InputMask from 'react-input-mask';
import { useRouter } from 'next/navigation';
import { verifySchema, type VerifyFormData } from '@/lib/validations/register';

export default function VerifyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    mode: 'onChange',
  });

  const watchedValues = watch();

  const onSubmit = async (data: VerifyFormData) => {
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const response = await fetch('/api/students/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telefone: data.telefone,
          cpf: data.cpf,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setNotFound(true);
        } else {
          setError(result.error || 'Erro ao verificar cadastro');
        }
        setLoading(false);
        return;
      }

      // Student found - redirect to continue page
      if (result.student_id) {
        router.push(`/register/continue?student_id=${result.student_id}`);
      } else {
        setNotFound(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error verifying student:', error);
      setError('Erro ao conectar com o servidor');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-black text-white py-4">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <img src="/logored.png" alt="Logo" className="h-12" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Já fez algum PG Repense antes?</h1>
          <p className="text-gray-600">Informe seus dados para continuar o cadastro</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-lg shadow-lg p-6 md:p-8"
        >
          <div className="space-y-6">
            {/* Phone Input */}
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

            {/* CPF Input */}
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

            {/* Error Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {notFound && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 mb-4">Cadastro não encontrado</p>
                <a
                  href="/register"
                  className="inline-block px-6 py-2 bg-[#c92041] text-white rounded-lg hover:bg-[#a01a33] transition-colors text-sm font-large"
                >
                  Primeira vez? Cadastre-se aqui
                </a>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-[#c92041] text-white rounded-lg font-medium hover:bg-[#a01a33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? 'Verificando...' : 'Continuar'}
            </button>

            {/* Link to Register */}
            <div className="text-center pt-4 border-t border-gray-200">
              <a
                href="/register"
                className="text-[#c92041] hover:text-[#a01a33] text-sm font-medium transition-colors"
              >
                Primeira vez? Cadastre-se aqui
              </a>
            </div>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">© Igreja Red 2026. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
