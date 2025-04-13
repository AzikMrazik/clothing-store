import { Request, Response, NextFunction } from 'express';
import { logAccess, logError, logSecurityEvent, SecurityEventType } from '../utils/logger';
import { NODE_ENV } from '../config';

// Middleware для логирования всех запросов
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Фиксируем время начала запроса
  const start = Date.now();
  
  // Сохраняем оригинальный метод end для перехвата ответа
  const originalEnd = res.end;
  
  // Перехватываем метод end для логирования после отправки ответа
  res.end = function(
    chunk?: any,
    encoding?: string | (() => void),
    callback?: () => void
  ): Response {
    // Вычисляем время ответа
    const responseTime = Date.now() - start;
    
    // Логируем доступ
    logAccess(req, res, responseTime);
    
    // Логируем подозрительную активность по статус-кодам
    if (res.statusCode >= 400) {
      // Для ошибок авторизации
      if (res.statusCode === 401 || res.statusCode === 403) {
        logSecurityEvent(
          SecurityEventType.AUTH_FAILURE,
          `Authentication/Authorization failed (${res.statusCode})`,
          { path: req.path, method: req.method },
          req
        );
      }
      // Для серверных ошибок
      else if (res.statusCode >= 500) {
        logSecurityEvent(
          SecurityEventType.SUSPICIOUS_ACTIVITY,
          `Server error occurred (${res.statusCode})`,
          { path: req.path, method: req.method },
          req
        );
      }
    }
    
    // Call the original end method with correct parameters
    return originalEnd.call(res, chunk, encoding as any, callback);
  };
  
  next();
};

// Middleware для логирования ошибок
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Логируем ошибку
  logError(err, req, res);
  
  // Определяем текст ошибки для пользователя
  const userErrorMessage = NODE_ENV === 'production' 
    ? 'Произошла внутренняя ошибка сервера' 
    : err.message;
  
  // Отправляем ответ, если он еще не был отправлен
  if (!res.headersSent) {
    res.status(500).json({ error: userErrorMessage });
  }
  
  next(err);
};

// Middleware для логирования и обнаружения подозрительной активности
export const securityActivityMonitor = (req: Request, res: Response, next: NextFunction) => {
  // Проверяем подозрительные паттерны в запросе
  const path = req.path.toLowerCase();
  const query = req.url.split('?')[1] || '';
  const body = req.body ? JSON.stringify(req.body).toLowerCase() : '';
  
  // Список потенциально опасных паттернов
  const dangerousPatterns = [
    /\.\.\//, // Path traversal
    /\s*select\s+.+\s*from\s+/i, // SQL injection
    /\s*union\s+select\s+/i, // SQL injection
    /<script.*?>.*?<\/script>/i, // XSS
    /javascript:/i, // XSS
    /onerror=/i, // XSS
    /onload=/i, // XSS
    /document\.cookie/i, // Cookie stealing
    /eval\(/i, // Code execution
    /^\/wp-/i, // WordPress exploits
    /^\/admin\//i, // Admin page brute force
    /^\/phpMyAdmin/i, // phpMyAdmin exploits
    /\$\{\s*jndi:/i, // Log4j exploit
  ];
  
  // Проверяем наличие подозрительных паттернов
  for (const pattern of dangerousPatterns) {
    if (
      pattern.test(path) || 
      pattern.test(query) || 
      pattern.test(body)
    ) {
      // Логируем подозрительную активность
      logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        'Suspicious pattern detected in request',
        {
          pattern: pattern.toString(),
          path: req.path,
          query: req.query,
          // Не логируем полное тело запроса в целях безопасности
          bodyKeys: req.body ? Object.keys(req.body) : []
        },
        req
      );
      
      // Для особо опасных паттернов можно блокировать запрос
      if (pattern.toString().includes('jndi:') || pattern.toString().includes('union select')) {
        return res.status(403).json({ error: 'Запрос заблокирован по соображениям безопасности' });
      }
      
      break;
    }
  }
  
  // Проверка на частые запросы с одного IP (более точная настройка в rate limiter)
  const ipThreshold = req.ip;
  const requestsKey = `requests:${ipThreshold}`;
  const now = Date.now();
  
  // Здесь в реальном приложении можно использовать Redis для отслеживания
  // Упрощенный механизм в виде глобального объекта для примера
  (global as any).requestTracker = (global as any).requestTracker || {};
  (global as any).requestTracker[requestsKey] = (global as any).requestTracker[requestsKey] || {
    count: 0,
    firstRequest: now
  };
  
  // Увеличиваем счетчик запросов
  (global as any).requestTracker[requestsKey].count += 1;
  
  // Проверяем, если превышен порог в короткий промежуток времени
  const timeDiff = now - (global as any).requestTracker[requestsKey].firstRequest;
  
  // Если было более 30 запросов за последние 10 секунд, логируем это
  if (timeDiff < 10000 && (global as any).requestTracker[requestsKey].count > 30) {
    logSecurityEvent(
      SecurityEventType.RATE_LIMIT,
      'Possible DDoS attack or scraping detected',
      {
        ip: req.ip,
        requestCount: (global as any).requestTracker[requestsKey].count,
        timeFrame: `${timeDiff}ms`,
      },
      req
    );
    
    // Сбрасываем счетчик
    (global as any).requestTracker[requestsKey] = {
      count: 0,
      firstRequest: now
    };
  }
  
  // Сбрасываем счетчик каждые 30 секунд
  if (timeDiff > 30000) {
    (global as any).requestTracker[requestsKey] = {
      count: 1,
      firstRequest: now
    };
  }
  
  next();
};