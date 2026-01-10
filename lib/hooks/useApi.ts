import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiOptions {
  retries?: number;
  retryDelay?: number;
  cacheTime?: number;
  staleTime?: number;
  enabled?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number; staleTime: number }>();

export function useApi<T>(
  url: string,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const {
    retries = 3,
    retryDelay = 1000,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 10 * 1000, // 10 seconds
    enabled = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    const cached = cache.get(url);
    if (cached) {
      const now = Date.now();
      const isStale = now - cached.timestamp > cached.staleTime;
      
      if (!isStale) {
        setData(cached.data);
        setLoading(false);
        setError(null);
        
        // Refresh in background if stale but not expired
        if (now - cached.timestamp > staleTime) {
          // Background refresh
        }
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    const attemptFetch = async (attempt: number): Promise<void> => {
      try {
        const response = await fetch(url, {
          credentials: 'include',
          signal: abortControllerRef.current?.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json().catch(() => {
          throw new Error('Invalid JSON response');
        });

        if (!result.success && result.error) {
          throw new Error(result.error);
        }

        const finalData = result.data || result;
        
        // Cache the result
        cache.set(url, {
          data: finalData,
          timestamp: Date.now(),
          staleTime: staleTime,
        });

        setData(finalData);
        setLoading(false);
        setError(null);
        retryCountRef.current = 0;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }

        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          return attemptFetch(attempt + 1);
        }

        setError(err.message || 'Failed to fetch data');
        setLoading(false);
        retryCountRef.current = attempt;
      }
    };

    await attemptFetch(1);
  }, [url, retries, retryDelay, staleTime, enabled]);

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Cleanup cache periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > cacheTime) {
          cache.delete(key);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [cacheTime]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
