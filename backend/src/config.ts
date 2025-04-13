import dotenv from 'dotenv';

// Загружаем переменные окружения из файла .env
dotenv.config();

// Берем значения из переменных окружения или используем значения по умолчанию
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = parseInt(process.env.PORT || '3001', 10);
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clothing-store';

// Настройки JWT
export const JWT = {
  SECRET: process.env.JWT_SECRET || 'your_default_jwt_secret_key_change_in_production',
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d', // 1 день
  REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your_default_refresh_secret_key_change_in_production',
  REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // 7 дней
};

// Настройки безопасности
export const SECURITY = {
  PASSWORD_SALT_ROUNDS: parseInt(process.env.PASSWORD_SALT_ROUNDS || '12', 10),
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
  LOGIN_TIMEOUT: parseInt(process.env.LOGIN_TIMEOUT || '15', 10) * 60 * 1000, // 15 минут в миллисекундах
  SESSION_SECRET: process.env.SESSION_SECRET || 'your_default_session_secret_change_in_production',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || NODE_ENV === 'production',
  COOKIE_MAX_AGE: parseInt(process.env.COOKIE_MAX_AGE || '864000000', 10), // 10 дней в миллисекундах
  CONTENT_SECURITY_POLICY: process.env.CONTENT_SECURITY_POLICY !== 'false' || NODE_ENV === 'production',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*', // В производственной среде замените на реальный домен
  CORS_METHODS: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,PATCH',
  // Добавляем настройки CSRF
  CSRF: {
    ENABLED: process.env.CSRF_ENABLED !== 'false', // Включено по умолчанию
    COOKIE_NAME: process.env.CSRF_COOKIE_NAME || 'XSRF-TOKEN',
    HEADER_NAME: process.env.CSRF_HEADER_NAME || 'X-CSRF-Token',
    COOKIE_OPTIONS: {
      httpOnly: false, // Должно быть false, чтобы JavaScript мог получить доступ к токену
      sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax' | 'none',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    },
    // Пути, исключенные из CSRF защиты
    EXCLUDED_PATHS: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/cart',  // Временно исключаем cart для отладки
      '/api/products', // Добавляем доступ к API товаров
      '/api/products/', // Вариант с завершающим слешем
      '/api/products', // Для создания товаров
      '/api/webhook' // Для внешних сервисов, которые не могут отправлять CSRF токен
    ]
  }
};

// Настройки ограничения запросов (rate limiting)
export const RATE_LIMIT = {
  WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 минут в миллисекундах по умолчанию
  MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 запросов за период окна
  SKIP_SUCCESSFUL_REQUESTS: process.env.RATE_LIMIT_SKIP_SUCCESSFUL !== 'false',
};

// Пути к статическим файлам
export const PATHS = {
  UPLOADS: process.env.UPLOAD_PATH || 'uploads/',
  LOGS: process.env.LOG_PATH || 'logs/',
  STATIC: process.env.STATIC_PATH || 'public/',
};

// Конфигурация для работы с базой данных
export const DATABASE = {
  CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
  POOL_SIZE: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  RETRY_ATTEMPTS: parseInt(process.env.DB_RETRY_ATTEMPTS || '3', 10),
  RETRY_DELAY: parseInt(process.env.DB_RETRY_DELAY || '1000', 10),
};

// Настройки для электронной почты
export const EMAIL = {
  HOST: process.env.EMAIL_HOST || 'smtp.example.com',
  PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  SECURE: process.env.EMAIL_SECURE === 'true',
  AUTH: {
    USER: process.env.EMAIL_USER || '',
    PASS: process.env.EMAIL_PASS || '',
  },
  FROM: process.env.EMAIL_FROM || 'noreply@example.com',
};

// Экспортируем все значения по умолчанию
export default {
  NODE_ENV,
  PORT,
  MONGODB_URI,
  JWT,
  SECURITY,
  RATE_LIMIT,
  PATHS,
  DATABASE,
  EMAIL,
};