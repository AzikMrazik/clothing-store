// API URL для работы через прокси Vite
export const API_URL = '/api';

// Определяем базовый URL для фронтенда
export const FRONTEND_URL = window.location.origin;

// Base URL for static assets CDN
export const CDN_URL = 'https://storage.yandexcloud.net/rvs-bucket';

// Добавляем подробное логирование API запросов для отладки
// Рекомендуется отключить в продакшене
export const API_DEBUG = process.env.NODE_ENV !== 'production';

// Максимальное время ожидания запроса в миллисекундах
export const API_TIMEOUT = 30000;

// Настройки безопасности
export const SECURITY = {
  // Настройки для защиты содержимого
  CONTENT_SECURITY_POLICY: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Ограничьте в продакшене
    STYLE_SRC: ["'self'", "'unsafe-inline'"],
    IMG_SRC: ["'self'", "data:", "blob:", "https://*"],
    CONNECT_SRC: ["'self'", API_URL],
  },
  
  // Настройки для маскировки чувствительных данных в логах
  SENSITIVE_FIELDS: ['password', 'token', 'credit_card', 'cvv'],
  
  // Настройки для защиты от XSS
  SANITIZE_USER_INPUT: true,
  
  // Настройки для cookie
  COOKIE_SETTINGS: {
    secure: window.location.protocol === 'https:',
    sameSite: 'strict',
  },
  
  // Включение защиты от CSRF
  CSRF_PROTECTION: true,
  
  // Отключение консоли в продакшене для защиты от базовых вредоносных скриптов
  DISABLE_CONSOLE_IN_PRODUCTION: true,
  
  // Защита от утечки данных через Referrer
  REFERRER_POLICY: 'strict-origin-when-cross-origin',
  
  // Защита от кликджекинга
  FRAME_OPTIONS: 'DENY',
  
  // Проверка целостности библиотек
  SUBRESOURCE_INTEGRITY: true,
  
  // Максимальный размер загружаемых файлов (в байтах)
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
  
  // Разрешенные типы файлов для загрузки
  ALLOWED_UPLOAD_MIME_TYPES: [
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'application/pdf',
    'text/csv'
  ],
};

// Включаем мониторинг для отслеживания потенциальных угроз
export const MONITORING = {
  ENABLED: true,
  REPORT_ERRORS: true,
  ERROR_ENDPOINT: '/api/monitoring/errors',
  
  // Дополнительные настройки мониторинга
  LOG_PERFORMANCE: true,
  LOG_SUSPICIOUS_ACTIVITY: true,
  ERROR_SAMPLING_RATE: 0.5, // Частота отправки ошибок (от 0 до 1)
};