import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import { SECURITY, PORT } from './config';
// Импортируем middleware безопасности
import { 
  xssProtection, 
  contentSecurityPolicy, 
  bruteForceProtection, 
  rateLimiter, 
  csrfProtection, 
  csrfToken, 
  secureHeaders,
  sqlInjectionCheck
} from './middleware/security';
// Импортируем middleware логирования
import { 
  requestLogger, 
  errorLogger, 
  securityActivityMonitor 
} from './middleware/logging';
// Импортируем middleware для обработки файлов
import { 
  handleFileUploadErrors, 
  validateUploadedFiles 
} from './middleware/fileUpload';
import productRoutes from './routes/products';
import authRoutes from './routes/auth';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';
import categoryRoutes from './routes/categories';
import promoRoutes from './routes/promos';

config();
const app = express();

// Улучшенные настройки безопасности
app.disable('x-powered-by');

// Применяем middleware для логирования запросов
app.use(requestLogger);

// Применяем middleware для мониторинга безопасности
app.use(securityActivityMonitor);

// Применяем middleware по безопасности
app.use(cookieParser(process.env.COOKIE_SECRET || 'cookie-secret-change-in-production')); // Необходим для cookie-based CSRF защиты
app.use(xssProtection);
app.use(contentSecurityPolicy);
app.use(secureHeaders);
app.use(bruteForceProtection());
app.use(rateLimiter);
app.use(sqlInjectionCheck);

// Настройка CORS с ограниченным доступом 
const corsOptions = {
  origin: SECURITY.CORS_ORIGIN.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'CSRF-Token'],
  credentials: true,
  maxAge: 86400
};
app.use(cors(corsOptions));

// Увеличиваем лимиты запросов с валидацией контента
app.use(express.json({ 
  limit: '2mb',
  verify: (req: Request, res: Response, buf: Buffer, encoding: string): void => {
    try {
      // Проверяем, что JSON правильно сформирован
      JSON.parse(buf.toString());
    } catch (e) {
      (res as any).status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  } 
}));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Middleware для отслеживания запросов с улучшенным логированием безопасности
app.use((req: Request, res: Response, next: NextFunction) => {
  // Очищаем чувствительные данные перед логированием
  const cleanedBody = { ...req.body };
  const sensitiveFields = ['password', 'token', 'secret', 'credit_card'];
  
  if (cleanedBody) {
    sensitiveFields.forEach(field => {
      if (cleanedBody[field]) {
        cleanedBody[field] = '***HIDDEN***';
      }
    });
  }
  
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin} - IP: ${req.ip}`);
  next();
});

// Настройка таймаутов для предотвращения DoS атак
app.use((req: Request, res: Response, next: NextFunction) => {
  req.setTimeout(30000); // 30 секунд на запрос
  res.setTimeout(30000);
  next();
});

// Обработка ошибок соединения
app.use((req: Request, res: Response, next: NextFunction) => {
  req.on('error', (error) => {
    console.error('Request error:', error);
  });
  
  res.on('error', (error) => {
    console.error('Response error:', error);
  });
  
  next();
});

// Настраиваем статические файлы для изображений с расширенными заголовками безопасности
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', SECURITY.CORS_ORIGIN.split(',')[0]);
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Vary', 'Origin');
    // Защита от clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Защита от MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Добавляем обработчики ошибок загрузки файлов
app.use(handleFileUploadErrors);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clothing-store';

// Улучшенная конфигурация подключения к MongoDB с дополнительной защитой
mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Обработка ошибок подключения
mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

// Обработка закрытия приложения
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

// Применяем CSRF защиту для всех небезопасных маршрутов (POST,PUT,DELETE)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Используем улучшенную версию CSRF защиты из middleware/security.ts
  // Она автоматически пропускает исключенные пути из конфигурации
  csrfProtection(req, res, next);
});

// Добавляем CSRF токен для всех ответов
app.use(csrfToken);

// API эндпоинты
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/promos', promoRoutes);

// Создаем роут для проверки безопасности (security.txt)
// Согласно https://securitytxt.org/
app.get('/.well-known/security.txt', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(
    `Contact: mailto:security@yourdomain.com
Expires: ${new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()}
Policy: https://yourdomain.com/security-policy
Hiring: https://yourdomain.com/careers
Preferred-Languages: en, ru`
  );
});

// Модифицируем обработку маршрутов для фронтенда:
// Обрабатываем только не-API запросы, возвращая JSON для API запросов и 404 для остальных
app.use('*', (req: Request, res: Response) => {
  // Если запрос начинается с /api, возвращаем JSON с ошибкой
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.originalUrl
    });
  }
  
  // Для не-API запросов возвращаем 404
  res.status(404).send('Not found');
});

// Глобальный обработчик ошибок
app.use(errorLogger);

// Обработка ошибок
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', err);
  
  // Обработка ошибок CSRF
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ 
      error: 'Invalid CSRF token. This could indicate a potential security breach. Please refresh the page and try again.' 
    });
  }
  
  // Остальные ошибки
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Внутренняя ошибка сервера' 
      : err.message
  });
});

// Запуск сервера с проверкой порта
const startServer = async () => {
  const port = typeof PORT === 'string' ? parseInt(PORT) : PORT;
  
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running securely on port ${port}`);
  }).on('error', (err) => {
    console.error('Error starting server:', err);
    process.exit(1);
  });
};

startServer();
