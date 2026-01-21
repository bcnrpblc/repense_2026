import Link from 'next/link';

// ============================================================================
// ROOT NOT FOUND PAGE
// ============================================================================

/**
 * Root 404 page component
 * Displayed when a route is not found
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {/* 404 Icon */}
        <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <span className="text-3xl font-bold text-blue-600">404</span>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Página não encontrada
        </h1>
        <p className="text-gray-600 mb-6">
          A página que você está procurando não existe ou foi movida.
        </p>

        {/* Action */}
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
