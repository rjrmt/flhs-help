'use client';

interface TopSubmittersProps {
  submitters: Array<{ name: string; count: number }>;
}

export function TopSubmitters({ submitters }: TopSubmittersProps) {
  const maxCount = Math.max(...submitters.map(s => s.count), 1);

  return (
    <div className="space-y-3">
      {submitters.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">No data available</p>
      ) : (
        submitters.map((submitter, index) => {
          const percentage = (submitter.count / maxCount) * 100;
          return (
            <div key={submitter.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900 truncate flex-1 mr-2">
                  {index + 1}. {submitter.name}
                </span>
                <span className="text-gray-600 font-semibold">{submitter.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    background: 'linear-gradient(90deg, #2E75B6 0%, #1e5a8f 100%)',
                  }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
