'use client';

interface AfternoonCourseWarningProps {
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

export default function AfternoonCourseWarning({
  isOpen,
  onContinue,
  onCancel,
}: AfternoonCourseWarningProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-10">
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4">
          <svg
            className="w-8 h-8 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 text-center mb-4">
          Observação
        </h3>

        {/* Message */}
        <p className="text-gray-700 text-center mb-6">
          Os grupos que começam às 16h30 não contam com a estrutura de Kids e Pré-Adolescentes.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Escolher outro horário
          </button>
          <button
            onClick={onContinue}
            className="flex-1 px-6 py-3 bg-[#c92041] text-white rounded-lg font-medium hover:bg-[#a01a33] transition-colors"
          >
            Quero continuar!
          </button>
        </div>
      </div>
    </div>
  );
}
