import { useState } from 'react';
import { useLoading } from '../contexts/LoadingContext';

interface ApiOptions {
  showLoader?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export const useApi = () => {
  const [error, setError] = useState<string | null>(null);
  const { showLoading, hideLoading } = useLoading();

  const call = async <T>(
    apiCall: () => Promise<T>,
    options: ApiOptions = {}
  ): Promise<T | null> => {
    const { showLoader = true } = options;
    
    try {
      if (showLoader) {
        showLoading();
      }
      setError(null);
      
      const result = await apiCall();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      if (showLoader) {
        hideLoading();
      }
    }
  };

  return {
    call,
    error,
    setError
  };
};