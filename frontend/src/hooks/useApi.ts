import { useState } from 'react';
import { useLoading } from '../contexts/LoadingContext';
import { API_DEBUG, API_TIMEOUT } from '../config';

interface ApiOptions {
  showLoader?: boolean;
  successMessage?: string;
  errorMessage?: string;
  timeout?: number;
}

export const useApi = () => {
  const [error, setError] = useState<string | null>(null);
  const { showLoading, hideLoading } = useLoading();

  const call = async <T>(
    apiCall: () => Promise<T>,
    options: ApiOptions = {}
  ): Promise<T | null> => {
    const { 
      showLoader = true,
      errorMessage = 'Произошла ошибка при запросе к серверу',
      timeout = API_TIMEOUT
    } = options;
    
    // Создаем promise с таймаутом для отмены слишком долгих запросов
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });
    
    try {
      if (showLoader) {
        showLoading();
      }
      setError(null);
      
      if (API_DEBUG) {
        console.log('🚀 API Request started');
      }
      
      // Используем Promise.race для отмены запроса по таймауту
      const result = await Promise.race([apiCall(), timeoutPromise]) as T;
      
      if (API_DEBUG) {
        console.log('✅ API Request successful:', result);
      }
      
      return result;
    } catch (err) {
      // Подробное логирование ошибки
      console.error('❌ API Request failed:', err);
      
      let errorMsg = errorMessage;
      if (err instanceof Error) {
        errorMsg = `${errorMessage}: ${err.message}`;
      }
      
      setError(errorMsg);
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