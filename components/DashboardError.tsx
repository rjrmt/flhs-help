'use client';

interface DashboardErrorProps {
  error?: { message?: string; stack?: string; name?: string };
}

export function DashboardError({ error }: DashboardErrorProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h1>
        <p className="text-gray-600 mb-4">
          There was an error loading the dashboard. Please try refreshing the page.
        </p>
        {process.env.NODE_ENV === 'development' && error?.message && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-mono text-red-700">{error.message}</p>
          </div>
        )}
        <div className="space-y-2">
          <a
            href="/login"
            className="inline-block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
          >
            Go to Login
          </a>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}
