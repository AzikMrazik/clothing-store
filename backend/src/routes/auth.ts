import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import { User } from '../models/User';

config();
const router = express.Router();

// Конфигурация JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '30d'; // Срок действия токена 30 дней

// Middleware для обработки ошибок в асинхронных маршрутах
const asyncHandler = (fn: Function) => (req: Request, res: Response) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error('Auth error:', err);
    res.status(500).json({ message: 'Ошибка сервера', error: err.message });
  });
};

// Функция для получения первого IP из заголовка x-forwarded-for
const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  let ip: string | undefined;

  if (typeof forwardedFor === 'string') {
    // Берем первый IP из списка, если он есть
    ip = forwardedFor.split(',')[0].trim();
  } else if (Array.isArray(forwardedFor)) {
    // Берем первый IP из массива
    ip = forwardedFor[0];
  }

  // Если x-forwarded-for не найден, используем remoteAddress
  return ip || req.socket.remoteAddress || 'unknown';
};

// Маршрут для входа пользователя
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  // Проверяем наличие username и password
  if (!username || !password) {
    return res.status(400).json({ message: 'Логин и пароль обязательны' });
  }
  
  // Получаем IP-адрес пользователя с помощью новой функции
  const userIp = getClientIp(req);
  
  // Находим пользователя по имени
  const user = await User.findOne({ username }).select('+password'); // Явно запрашиваем пароль
  if (!user) {
    return res.status(401).json({ message: 'Неверные учетные данные' });
  }
  
  // Проверяем пароль
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Неверные учетные данные' });
  }
  
  // Обновляем информацию о последнем входе и IP
  user.lastLogin = new Date();
  user.lastIp = userIp;
  await user.save();
  
  // Создаем JWT токен
  const payload = {
    userId: user._id,
    username: user.username,
    role: user.role,
    ip: userIp // Добавляем IP пользователя в токен
  };
  
  const token = jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  res.json({
    token,
    username: user.username,
    role: user.role
  });
}));

// Маршрут для проверки валидности токена
router.get('/verify', asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Не предоставлен токен авторизации' });
  }
  
  try {
    // Проверяем токен
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Получаем IP-адрес пользователя с помощью новой функции
    const userIp = getClientIp(req);
    
    // Проверяем соответствие IP (простая проверка - в продакшене можно использовать более сложные)
    if (decoded.ip !== userIp) {
      return res.status(401).json({ message: 'Токен не действителен для текущего IP' });
    }
    
    // Токен валиден, возвращаем информацию о пользователе
    res.json({
      username: decoded.username,
      role: decoded.role
    });
  } catch (error) {
    return res.status(401).json({ message: 'Токен не действителен' });
  }
}));

// Создание тестового пользователя-администратора при запуске сервера
async function createInitialAdmin() {
  try {
    // Проверяем, существует ли администратор
    const adminExists = await User.findOne({ username: 'admin' });
    
    // Если нет, создаем его
    if (!adminExists) {
      const admin = new User({
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      });
      
      await admin.save();
      console.log('Создан тестовый пользователь администратора:');
      console.log('Логин: admin');
      console.log('Пароль: admin123');
    }
  } catch (error) {
    console.error('Ошибка при создании администратора:', error);
  }
}

// Вызываем функцию создания администратора
createInitialAdmin();

export default router;
