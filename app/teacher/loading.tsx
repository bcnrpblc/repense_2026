// ============================================================================
// TEACHER LOADING STATE
// ============================================================================

/**
 * Teacher loading component with skeleton UI
 * Displayed during teacher page transitions
 */
export default function TeacherLoading() {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-64"></div>
      </div>

      {/* Cards Skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex gap-2 mb-2">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-40 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="text-right">
                <div className="h-6 bg-gray-200 rounded w-12 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
