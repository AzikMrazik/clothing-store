import { API_URL, API_TIMEOUT } from '../config';
import securityService from './security';

// Типы для запросов
type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

// Класс для безопасной работы с API
class ApiService {
  // Базовый URL для API
  private readonly baseUrl: string = API_URL;
  
  // Тайм-аут по умолчанию
  private readonly timeout: number = API_TIMEOUT;
  
  // Метод для выполнения запроса с защитными механизмами
  async request<T = any>(
    method: RequestMethod,
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    // Получаем CSRF токен для защиты от CSRF атак
    const csrfToken = securityService.getCSRFToken();
    
    // Устанавливаем базовые заголовки
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // Помогает против некоторых CSRF атак
      ...options.headers,
    };
    
    // Добавляем CSRF токен, если он доступен
    if (csrfToken) {
      headers['CSRF-Token'] = csrfToken;
    }
    
    // Добавляем JWT токен для авторизации
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Создаем контроллер для отмены запроса по тайм-ауту
    const controller = new AbortController();
    const { signal } = options.signal ? options : controller;
    
    // Устанавливаем тайм-аут для запроса
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, options.timeout || this.timeout);
    
    try {
      // Формируем URL для запроса
      const url = `${this.baseUrl}${endpoint}`;
      
      // Настройки запроса
      const requestOptions: RequestInit = {
        method,
        headers,
        signal,
        credentials: 'include', // Для корректной работы с куки
      };
      
      // Добавляем тело запроса для методов, отличных от GET
      if (method !== 'GET' && data) {
        requestOptions.body = JSON.stringify(data);
      }
      
      // Выполняем запрос
      const response = await fetch(url, requestOptions);
      
      // Очищаем таймаут
      clearTimeout(timeoutId);
      
      // Анализируем ответ
      if (!response.ok) {
        // Пытаемся получить детали ошибки из JSON
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: response.statusText };
        }
        
        // Если токен устарел, пытаемся обновить его
        if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
          // Пытаемся обновить токен и повторить запрос
          return this.handleTokenRefresh<T>(method, endpoint, data, options);
        }
        
        // Выбрасываем ошибку с информацией о проблеме
        throw {
          status: response.status,
          message: errorData.error || 'Unknown error',
          data: errorData
        };
      }
      
      // Для запросов без содержимого (например, DELETE)
      if (response.status === 204) {
        return {} as T;
      }
      
      // Парсим JSON из ответа
      return await response.json();
      
    } catch (error) {
      // Очищаем таймаут при ошибке
      clearTimeout(timeoutId);
      
      // Если ошибка из-за тайм-аута, выбрасываем специальную ошибку
      if (error instanceof Error && error.name === 'AbortError') {
        throw {
          status: 408,
          message: 'Request timeout',
          data: { error: 'The request took too long to complete' }
        };
      }
      
      // Проверяем, является ли ошибка сетевой
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw {
          status: 0,
          message: 'Network error',
          data: { error: 'Unable to connect to the server' }
        };
      }
      
      // Прокидываем остальные ошибки
      throw error;
    }
  }
  
  // Обработка обновления токена
  private async handleTokenRefresh<T>(
    method: RequestMethod,
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    try {
      // Пытаемся обновить токен
      const refreshTokenResult = await this.refreshToken();
      
      if (refreshTokenResult) {
        // Повторяем исходный запрос с новым токеном
        return this.request<T>(method, endpoint, data, options);
      }
      
      // Если обновление не удалось, выполняем логаут
      this.logout();
      
      throw {
        status: 401,
        message: 'Session expired',
        data: { error: 'Your session has expired. Please login again.' }
      };
    } catch (error) {
      // При ошибке обновления токена выполняем логаут
      this.logout();
      throw error;
    }
  }
  
  // Обновление токена
  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        return false;
      }
      
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      
      // Сохраняем новые токены
      this.saveAuthTokens(data.accessToken, data.refreshToken);
      
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }
  
  // Получение авторизационного токена
  private getAuthToken(): string | null {
    // Используем безопасное хранилище
    const authData = securityService.secureRetrieve('authData');
    return authData ? authData.token : null;
  }
  
  // Сохранение токенов аутентификации
  saveAuthTokens(accessToken: string, refreshToken: string): void {
    // Безопасно сохраняем токен доступа
    securityService.secureStore('authData', { token: accessToken });
    
    // Сохраняем refresh token
    localStorage.setItem('refreshToken', refreshToken);
  }
  
  // Выход пользователя
  logout(): void {
    // Удаляем токены
    securityService.secureStore('authData', null);
    localStorage.removeItem('refreshToken');
    
    // Перенаправление на страницу входа
    window.location.href = '/login';
  }
  
  // Удобные методы для разных типов запросов
  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }
  
  async post<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }
  
  async put<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }
  
  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
  
  async patch<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options);
  }
}

// Создаем экземпляр сервиса API
const apiService = new ApiService();

export default apiService;