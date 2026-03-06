'use client';

interface PageErrorProps {
  title?: string;
  message?: string;
  details?: React.ReactNode;
  errorMessage?: string;
  links?: { href: string; label: string }[];
}

export function PageError({
  title = 'Error Loading Page',
  message = 'There was an error loading this page. Please try refreshing.',
  details,
  errorMessage,
  links = [{ href: '/login', label: 'Go to Login' }],
}: PageErrorProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-600 mb-4">{message}</p>
        {details}
        {process.env.NODE_ENV === 'development' && errorMessage && (
          <p className="text-sm text-red-600 mb-4 font-mono">{errorMessage}</p>
        )}
        <div className="space-y-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
