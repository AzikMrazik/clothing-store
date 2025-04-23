import fs from 'fs';
import path from 'path';
import { Request as ExpressRequest, Response } from 'express';
import winston from 'winston';
import 'winston-daily-rotate-file';
import { PATHS } from '../config';

// Extend Express Request to include user property
interface RequestWithUser extends ExpressRequest {
  user?: {
    id: string;
    [key: string]: any;
  };
}

// Define our local Request type
type Request = RequestWithUser;

/**
 * Типы событий безопасности для логирования
 */
export enum SecurityEventType {
  BRUTE_FORCE = 'BRUTE_FORCE',
  RATE_LIMIT = 'RATE_LIMIT',
  SQL_INJECTION = 'SQL_INJECTION',
  XSS = 'XSS',
  SUSPICIOUS_REQUEST = 'SUSPICIOUS_REQUEST',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  CSRF = 'CSRF',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS',
  FILE_UPLOAD = 'FILE_UPLOAD',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  ACCOUNT_CHANGE = 'ACCOUNT_CHANGE',
  AUTH_FAILURE = 'AUTH_FAILURE',                   // Added for backward compatibility
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'      // Added for backward compatibility
}

/**
 * Interface for security log events
 */
export interface SecurityLogEvent {
  type: SecurityEventType;
  timestamp: string;
  message: string;
  details: any;
  request?: {
    method: string;
    path: string;
    ip: string;
    userAgent?: string;
    userId?: string;
  };
}

// Названия файлов для разных типов логов
const LOG_FILES = {
  ACCESS: 'access-%DATE%.log',
  ERROR: 'error-%DATE%.log',
  SECURITY: 'security-%DATE%.log',
};

// Путь к директории с логами
const LOG_DIR = path.join(__dirname, '../../logs');

// Создаем директорию для логов, если её нет
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Обрабатываем чувствительные данные перед логированием
const maskSensitiveData = (data: any): any => {
  if (!data) return data;
  
  // Список чувствительных полей, которые нужно маскировать
  const sensitiveFields = [
    'password', 'token', 'refreshToken', 'secret', 'apiKey',
    'creditCard', 'cardNumber', 'cvv', 'ssn', 'passport'
  ];
  
  // Рекурсивно обходим объект
  const maskRecursively = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    // Обрабатываем массивы
    if (Array.isArray(obj)) {
      return obj.map(item => maskRecursively(item));
    }
    
    const result = { ...obj };
    
    for (const key in result) {
      const lowerKey = key.toLowerCase();
      
      // Маскируем чувствительные поля
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        result[key] = typeof result[key] === 'string' 
          ? '***MASKED***' 
          : typeof result[key] === 'number' ? 0 : null;
      } else if (typeof result[key] === 'object' && result[key] !== null) {
        // Рекурсивно обрабатываем вложенные объекты
        result[key] = maskRecursively(result[key]);
      }
    }
    
    return result;
  };
  
  return maskRecursively(data);
};

// Форматирование логов
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaData = Object.keys(meta).length ? JSON.stringify(maskSensitiveData(meta), null, 2) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaData}`;
  })
);

// Создаем транспорты для разных типов логов
const accessLogTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, LOG_FILES.ACCESS),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info',
});

const errorLogTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, LOG_FILES.ERROR),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
});

const securityLogTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, LOG_FILES.SECURITY),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '90d', // Храним дольше для аудита безопасности
  level: 'warn',
});

// Client-side error logging transport
const clientErrorLogTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'client-error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '7d',
  level: 'warn',
});

// Создаем логгеры для разных типов логов
export const accessLogger = winston.createLogger({
  format: logFormat,
  transports: [accessLogTransport],
});

export const errorLogger = winston.createLogger({
  format: logFormat,
  transports: [errorLogTransport],
});

export const securityLogger = winston.createLogger({
  format: logFormat,
  transports: [securityLogTransport],
});

// Logger for client-side errors
export const clientErrorLogger = winston.createLogger({
  format: logFormat,
  transports: [clientErrorLogTransport],
});

// Добавляем консольный вывод для режима разработки
if (process.env.NODE_ENV !== 'production') {
  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  });
  
  accessLogger.add(consoleTransport);
  errorLogger.add(consoleTransport);
  securityLogger.add(consoleTransport);
  clientErrorLogger.add(consoleTransport);
}

// Функция для логирования доступа
export const logAccess = (req: Request, res: Response, responseTime?: number) => {
  const logData = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    referer: req.headers.referer || '-',
    statusCode: res.statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    userId: req.user?.id || 'anonymous',
  };
  
  accessLogger.info('HTTP Access', logData);
};

// Функция для логирования ошибок
export const logError = (error: Error, req?: Request, res?: Response) => {
  const logData: any = {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    }
  };
  
  if (req) {
    logData.request = {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      userId: req.user?.id || 'anonymous',
    };
  }
  
  if (res) {
    logData.statusCode = res.statusCode;
  }
  
  errorLogger.error('Application Error', logData);
};

// Функция для логирования событий безопасности
export const logSecurityEvent = (
  type: SecurityEventType, 
  message: string, 
  details: any = {}, 
  req?: Request
) => {
  const now = new Date();
  const timestamp = now.toISOString();
  
  const event: SecurityLogEvent = {
    type,
    timestamp,
    message,
    details,
  };
  
  // Если передан запрос, добавляем информацию о нем
  if (req) {
    event.request = {
      method: req.method,
      path: req.path,
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'],
      userId: req.user?.id,
    };
  }
  
  // Логирование в консоль
  console.log(`[SECURITY][${type}] ${message}`, {
    timestamp,
    details,
    request: event.request,
  });
  
  // Записываем в файл для постоянного хранения
  try {
    const logDir = path.join(process.cwd(), PATHS.LOGS);
    
    // Создаем директорию для логов, если она не существует
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFilePath = path.join(logDir, `security-${now.toISOString().split('T')[0]}.log`);
    
    fs.appendFileSync(
      logFilePath, 
      JSON.stringify(event) + '\n',
      { encoding: 'utf-8' }
    );
  } catch (err) {
    console.error('Error writing security event to log file:', err);
  }
};

// Function to log client-side errors
export const logClientError = (data: any) => {
  clientErrorLogger.warn('Client-side Error', data);
};

/**
 * Общий логгер для приложения
 */
export const logger = {
  info: (message: string, meta: any = {}) => {
    console.log(`[INFO] ${message}`, meta);
  },
  
  warn: (message: string, meta: any = {}) => {
    console.warn(`[WARN] ${message}`, meta);
  },
  
  error: (message: string, error: Error | any = {}, meta: any = {}) => {
    console.error(`[ERROR] ${message}`, error, meta);
    
    // Записываем ошибки в отдельный файл
    try {
      const logDir = path.join(process.cwd(), PATHS.LOGS);
      
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const now = new Date();
      const logFilePath = path.join(logDir, `error-${now.toISOString().split('T')[0]}.log`);
      
      fs.appendFileSync(
        logFilePath, 
        JSON.stringify({
          timestamp: now.toISOString(),
          message,
          stack: error?.stack || 'No stack trace',
          meta
        }) + '\n',
        { encoding: 'utf-8' }
      );
    } catch (err) {
      console.error('Error writing error to log file:', err);
    }
  },
  
  debug: (message: string, meta: any = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, meta);
    }
  },
  
  security: logSecurityEvent,
};

export default logger;