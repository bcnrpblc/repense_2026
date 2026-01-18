'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FourStepsDialog from '@/components/FourStepsDialog';

export default function RegisterPage() {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);

  const handleYes = () => {
    // Proceed to registration form
    router.push('/register/form');
  };

  const handleNo = () => {
    // Show confirmation dialog
    setShowDialog(true);
  };

  const handleEnroll = () => {
    // Redirect to 4 Passos website
    window.location.href = 'https://igrejared.com/4-passos';
  };

  const handleCancelDialog = () => {
    setShowDialog(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-black text-white py-4">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <img src="/logored.png" alt="Logo" className="h-12" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          {/* Welcome Icon/Illustration */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-[#c92041] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Bem-vindo ao PG Repense!
          </h1>

          {/* Question */}
          <p className="text-xl md:text-2xl text-gray-700 mb-12">
            Você já completou os 4 Passos?
          </p>

          {/* Action Buttons */}
          <div className="w-full max-w-md space-y-4">
            <button
              onClick={handleYes}
              className="w-full px-8 py-4 bg-[#c92041] text-white text-lg font-semibold rounded-lg hover:bg-[#a01a33] transition-colors shadow-lg"
            >
              Sim, já completei
            </button>

            <button
              onClick={handleNo}
              className="w-full px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors shadow-md"
            >
              Não completei ainda
            </button>
          </div>

          {/* Additional Info */}
          <p className="mt-8 text-sm text-gray-500 max-w-md">
            Os 4 Passos são um pré-requisito para participar do PG Repense.
          </p>
        </div>
      </main>

      {/* 4 Passos Dialog */}
      <FourStepsDialog
        isOpen={showDialog}
        onEnroll={handleEnroll}
        onCancel={handleCancelDialog}
      />

      {/* Footer */}
      <footer className="bg-black text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">© Igreja Red 2026. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
