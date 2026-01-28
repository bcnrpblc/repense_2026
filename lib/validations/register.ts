import { z } from 'zod';
import { validateCPF } from '../utils/cpf';
import { validateBrazilianDate, brazilianDateToISO } from '../utils/date';
import { hasFullName } from '../utils/names';

export const registerSchema = z.object({
  // Step 1 - Personal Information
  nome: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .refine(hasFullName, {
      message: 'Digite nome e sobrenome (nome completo)',
    }),
  cpf: z.string().refine(
    (val) => {
      const cleaned = val.replace(/\D/g, '');
      return cleaned.length === 11 && validateCPF(val);
    },
    { message: 'CPF inválido' }
  ),
  telefone: z.string().refine(
    (val) => {
      const cleaned = val.replace(/\D/g, '');
      return cleaned.length === 11;
    },
    { message: 'Telefone deve ter 11 dígitos' }
  ),
  email: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') {
          return true; // Optional field
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(val);
      },
      { message: 'Email inválido' }
    ),
  genero: z.enum(['Masculino', 'Feminino', 'Outro']).optional(),
  estado_civil: z.enum(['Solteiro', 'Casado', 'Divorciado', 'Viúvo']).optional(),
  nascimento: z.string().refine(
    (val) => {
      if (!val || val.trim() === '') {
        return false; // Required field
      }
      return validateBrazilianDate(val);
    },
    { message: 'Data de nascimento deve estar no formato dd-MM-yyyy (ex: 25-12-1990)' }
  ),
  cidade_preferencia: z.enum(['Indaiatuba', 'Itu'], {
    message: 'Selecione uma cidade',
  }),
  
  // Step 2 - Course Selection
  course_id: z.string().min(1, 'Selecione um curso'),
}).transform((data) => {
  // Transform nascimento from Brazilian format to ISO format for storage
  const isoDate = brazilianDateToISO(data.nascimento);
  return {
    ...data,
    nascimento: isoDate || data.nascimento, // Keep original if transformation fails (validation will catch it)
    email: data.email && data.email.trim() ? data.email.trim() : undefined,
  };
});

export type RegisterFormData = z.input<typeof registerSchema>;

export const verifySchema = z.object({
  telefone: z.string().refine(
    (val) => {
      const cleaned = val.replace(/\D/g, '');
      return cleaned.length === 11;
    },
    { message: 'Telefone deve ter 11 dígitos' }
  ),
  cpf: z.string().refine(
    (val) => {
      const cleaned = val.replace(/\D/g, '');
      return cleaned.length === 11 && validateCPF(val);
    },
    { message: 'CPF inválido' }
  ),
});

export type VerifyFormData = z.infer<typeof verifySchema>;
