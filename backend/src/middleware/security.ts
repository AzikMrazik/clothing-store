import { Request, Response, NextFunction } from 'express';
import { RATE_LIMIT, SECURITY } from '../config';
import { logSecurityEvent, SecurityEventType } from '../utils/logger';
import csrf from 'csurf';
import helmet from 'helmet';

// Type declarations for global rateLimit
interface RateLimitInfo {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  [ip: string]: RateLimitInfo;
}

// Extend the global namespace
declare global {
  var rateLimit: RateLimitStore;
}

// Глобальный объект для отслеживания попыток аутентификации
const loginAttempts: Record<string, { count: number, lastAttempt: number }> = {};

/**
 * Middleware для защиты от XSS-атак
 */
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Устанавливаем заголовки безопасности с помощью helmet
  helmet({
    xssFilter: true,
    contentSecurityPolicy: false, // Устанавливается отдельно
  })(req, res, next);
};

/**
 * Middleware для настройки Content Security Policy
 */
export const contentSecurityPolicy = (req: Request, res: Response, next: NextFunction) => {
  // Проверяем, включена ли CSP в конфигурации
  if (!SECURITY.CONTENT_SECURITY_POLICY) {
    return next();
  }

  // Настраиваем CSP
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // В продакшене стоит убрать unsafe-eval
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  })(req, res, next);
};

/**
 * Middleware для защиты от brute force атак
 */
export const bruteForceProtection = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Применяем только для эндпоинтов аутентификации
    if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
      const ip = req.ip;
      const now = Date.now();
      
      if (!ip) {
        return next();
      }
      
      // Проверяем, есть ли уже попытки для этого IP
      if (loginAttempts[ip] !== undefined) {
        // Проверяем, не истекло ли время блокировки
        const attempts = loginAttempts[ip];
        const timeSinceLastAttempt = now - attempts.lastAttempt;
        
        if (attempts.count >= SECURITY.MAX_LOGIN_ATTEMPTS) {
          if (timeSinceLastAttempt < SECURITY.LOGIN_TIMEOUT) {
            // Логируем подозрительную активность
            logSecurityEvent(
              SecurityEventType.BRUTE_FORCE, 
              'Too many login attempts detected', 
              { ip, attemptCount: attempts.count },
              req
            );
            
            return res.status(429).json({ 
              error: 'Too many login attempts. Please try again later.' 
            });
          } else {
            // Сбрасываем счетчик, если время блокировки истекло
            loginAttempts[ip] = {
              ...loginAttempts[ip],
              count: 0
            };
          }
        }
        
        // Обновляем время последней попытки
        loginAttempts[ip] = {
          count: loginAttempts[ip].count + 1,
          lastAttempt: now
        };
      } else {
        // Первая попытка для этого IP
        loginAttempts[ip] = {
          count: 1,
          lastAttempt: now
        };
      }
    }
    
    next();
  };
};

/**
 * Middleware для ограничения количества запросов (rate limiting)
 */
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // В реальном приложении здесь можно использовать express-rate-limit или подобную библиотеку
  // Для примера используем упрощенную имплементацию
  const ip = req.ip;
  const now = Date.now();
  
  if (!ip) {
    return next();
  }
  
  // Инициализируем глобальный объект для rate limit
  if (!globalThis.rateLimit) {
    globalThis.rateLimit = {};
  }
  
  if (!globalThis.rateLimit[ip]) {
    globalThis.rateLimit[ip] = { count: 0, resetTime: now + RATE_LIMIT.WINDOW_MS };
  }
  
  const rateLimitInfo = globalThis.rateLimit[ip];
  
  // Проверяем, не истек ли период ограничения
  if (now > rateLimitInfo.resetTime) {
    globalThis.rateLimit[ip] = { count: 1, resetTime: now + RATE_LIMIT.WINDOW_MS };
    return next();
  }
  
  // Увеличиваем счетчик запросов
  rateLimitInfo.count++;
  
  // Проверяем, не превышен ли лимит
  if (rateLimitInfo.count > RATE_LIMIT.MAX_REQUESTS) {
    // Логируем превышение лимита
    logSecurityEvent(
      SecurityEventType.RATE_LIMIT, 
      'Rate limit exceeded', 
      { ip, requestCount: rateLimitInfo.count },
      req
    );
    
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((rateLimitInfo.resetTime - now) / 1000)
    });
  }
  
  next();
};

/**
 * Middleware для защиты от CSRF-атак
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Проверяем, включена ли CSRF защита
  if (!SECURITY.CSRF.ENABLED) {
    return next();
  }
  
  // Улучшенная проверка пути для исключений
  const shouldExcludePath = SECURITY.CSRF.EXCLUDED_PATHS.some(excludedPath => {
    // Если путь точно совпадает - исключаем
    if (req.path === excludedPath) {
      return true;
    }
    
    // Проверяем, начинается ли путь с исключенного пути
    // Например, /api/products/123 должен соответствовать исключению /api/products
    if (req.path.startsWith(excludedPath + '/')) {
      return true;
    }
    
    return false;
  });
  
  if (shouldExcludePath) {
    return next();
  }
  
  // Применяем CSRF защиту
  const csrfMiddleware = csrf({ 
    cookie: SECURITY.CSRF.COOKIE_OPTIONS,
    value: (req) => {
      // Получаем токен из заголовка, указанного в конфигурации
      return req.headers[SECURITY.CSRF.HEADER_NAME.toLowerCase()] as string || 
             req.headers['x-csrf-token'] as string ||
             req.headers['x-xsrf-token'] as string;
    }
  });
  
  return csrfMiddleware(req, res, next);
};

/**
 * Middleware для добавления CSRF-токена в ответ
 */
export const csrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Пропускаем, если CSRF защита отключена
  if (!SECURITY.CSRF.ENABLED) {
    return next();
  }
  
  // Добавляем CSRF токен в cookie для фронтенда
  if (req.csrfToken) {
    const token = req.csrfToken();
    res.cookie(SECURITY.CSRF.COOKIE_NAME, token, SECURITY.CSRF.COOKIE_OPTIONS);
  }
  next();
};

/**
 * Middleware для добавления дополнительных заголовков безопасности
 */
export const secureHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Защита от Clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Защита от MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Ограничение referrer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Feature-Policy (современный аналог - Permissions-Policy)
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
};

/**
 * Middleware для защиты от SQL-инъекций
 */
export const sqlInjectionCheck = (req: Request, res: Response, next: NextFunction) => {
  // Простая проверка на SQL-инъекции
  const checkForSqlInjection = (value: string): boolean => {
    const sqlPattern = /('|"|;|--|\/\*|\*\/|xp_|\%27|\%22|\%23|SELECT|INSERT|UPDATE|DELETE|DROP|UNION|\bOR\b|\bAND\b)/i;
    return sqlPattern.test(value);
  };
  
  const checkObject = (obj: any): boolean => {
    if (!obj) return false;
    
    for (const key in obj) {
      if (typeof obj[key] === 'string' && checkForSqlInjection(obj[key])) {
        return true;
      } else if (typeof obj[key] === 'object' && checkObject(obj[key])) {
        return true;
      }
    }
    
    return false;
  };
  
  // Проверяем параметры запроса и тело
  if (
    checkObject(req.query) || 
    checkObject(req.body) || 
    checkObject(req.params)
  ) {
    // Логируем попытку SQL-инъекции
    logSecurityEvent(
      SecurityEventType.SQL_INJECTION,
      'Possible SQL injection detected',
      {
        path: req.path,
        method: req.method,
        ip: req.ip
      },
      req
    );
    
    return res.status(403).json({ error: 'Запрос заблокирован по соображениям безопасности' });
  }
  
  next();
};