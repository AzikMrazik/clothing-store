/**
 * Глобальные типы для приложения
 */
declare global {
  namespace NodeJS {
    interface Global {
      rateLimit: Record<string, { count: number; resetTime: number }>;
    }
  }

  // Для современного синтаксиса TypeScript
  var rateLimit: Record<string, { count: number; resetTime: number }>;
}

// Расширяем глобальный объект Express Request
declare namespace Express {
  interface Request {
    // Метод для создания CSRF токена
    csrfToken?: () => string;

    // Пользовательская информация для аутентификации
    user?: {
      id: string;
      email?: string;
      role?: string;
      [key: string]: any;
    };
  }
}

// Экспортируем пустой объект для правильной обработки файла как модуля
export {};