'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { Button } from './ui';
import { getAuthToken } from '@/lib/hooks/useAuth';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface StudentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: {
    id: string;
    nome: string;
    classId: string;
  };
}

// ============================================================================
// STUDENT REPORT MODAL COMPONENT
// ============================================================================

export function StudentReportModal({
  isOpen,
  onClose,
  onSuccess,
  student,
}: StudentReportModalProps) {
  const [reportText, setReportText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReportText('');
    }
  }, [isOpen]);

  const characterCount = reportText.length;
  const minChars = 20;
  const maxChars = 500;
  const isValid = characterCount >= minChars && characterCount <= maxChars;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      return;
    }

    setSubmitting(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/teacher/students/${student.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: student.classId,
          reportText: reportText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar relatório');
      }

      toast.success('Relatório enviado aos administradores');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar relatório');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Escrever Relatório"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student Name (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Participante
          </label>
          <input
            type="text"
            value={student.nome}
            disabled
            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
          />
        </div>

        {/* Report Text */}
        <div>
          <label htmlFor="reportText" className="block text-sm font-medium text-gray-700 mb-1">
            Relatório *
          </label>
          <textarea
            id="reportText"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Descreva a situação do participante, observações importantes, etc..."
            rows={6}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
              characterCount > maxChars ? 'border-red-300' : 'border-gray-300'
            }`}
            required
          />
          <div className="flex items-center justify-between mt-1">
            <p className={`text-xs ${
              characterCount < minChars
                ? 'text-gray-500'
                : characterCount > maxChars
                ? 'text-red-600'
                : 'text-gray-500'
            }`}>
              {characterCount < minChars
                ? `Mínimo ${minChars} caracteres (${minChars - characterCount} restantes)`
                : characterCount > maxChars
                ? `Máximo ${maxChars} caracteres (${characterCount - maxChars} excedentes)`
                : `${characterCount}/${maxChars} caracteres`}
            </p>
          </div>
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
            disabled={!isValid || submitting}
            className="flex-1"
          >
            {submitting ? 'Enviando...' : 'Enviar Relatório'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
