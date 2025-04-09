import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { config } from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import productRoutes from './routes/products';
import authRoutes from './routes/auth';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';

config();
const app = express();

// Устанавливаем trust proxy для корректной работы с X-Forwarded-For заголовками
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Настроенный CORS
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clothing-store';

// Улучшенная конфигурация подключения к MongoDB
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  family: 4, // Принудительно использовать IPv4
})
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Завершаем процесс при ошибке подключения
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

app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

const findAvailablePort = async (startPort: number): Promise<number> => {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });

    server.listen(startPort, () => {
      server.close(() => {
        resolve(startPort);
      });
    });
  });
};

// Заменяем простой запуск сервера на версию с поиском порта
const startServer = async () => {
  const desiredPort = parseInt(process.env.PORT || '3001');
  const availablePort = await findAvailablePort(desiredPort);
  
  app.listen(availablePort, () => {
    console.log(`Server running on port ${availablePort}`);
    if (availablePort !== desiredPort) {
      console.log(`Note: Original port ${desiredPort} was in use`);
    }
  }).on('error', (err) => {
    console.error('Error starting server:', err);
    process.exit(1);
  });
};

startServer();
