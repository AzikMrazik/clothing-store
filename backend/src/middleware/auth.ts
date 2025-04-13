import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../utils/encryption';

// Расширяем интерфейс Express.Request для добавления пользователя
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware для проверки аутентификации
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Получаем токен из заголовков
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    // Извлекаем токен из заголовка
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }
    
    try {
      // Проверяем токен
      const decoded = verifyJWT(token);
      
      // Добавляем данные пользователя в объект запроса
      req.user = decoded;
      
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Недействительный или истекший токен' });
    }
  } catch (error) {
    console.error('Ошибка аутентификации:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при проверке авторизации' });
  }
};

// Middleware для проверки роли пользователя
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    // Проверяем, имеет ли пользователь необходимую роль
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Доступ запрещен. У вас нет необходимых прав для выполнения этой операции' 
      });
    }
    
    next();
  };
};

// Middleware для проверки владельца ресурса
export const checkResourceOwnership = (resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Получаем ID ресурса из параметров запроса
      const resourceId = req.params[resourceIdParam];
      
      if (!resourceId) {
        return res.status(400).json({ error: 'ID ресурса не предоставлен' });
      }
      
      // Проверяем, является ли текущий пользователь администратором
      if (req.user.role === 'admin') {
        // Администраторы имеют доступ ко всем ресурсам
        return next();
      }
      
      // Получаем данные о ресурсе из базы данных
      // Примечание: вам нужно заменить эту функцию на реальный запрос к вашей модели
      // const resource = await ResourceModel.findById(resourceId);
      const resource = { userId: req.user.id }; // Замените это вашей логикой
      
      if (!resource) {
        return res.status(404).json({ error: 'Ресурс не найден' });
      }
      
      // Проверяем, принадлежит ли ресурс текущему пользователю
      if (resource.userId !== req.user.id) {
        return res.status(403).json({ 
          error: 'Доступ запрещен. Вы не являетесь владельцем этого ресурса' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Ошибка проверки владельца ресурса:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера при проверке прав доступа' });
    }
  };
};

// Middleware для обработки запросов на сброс пароля или проверку электронной почты
export const validateToken = (tokenType: 'reset' | 'verify') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Токен не предоставлен или неверного формата' });
      }
      
      // Здесь должна быть логика проверки токена в базе данных
      // и проверка срока его действия
      
      // Примерная проверка (замените на вашу реальную логику):
      // const tokenRecord = await TokenModel.findOne({ 
      //   token, 
      //   type: tokenType,
      //   expiresAt: { $gt: new Date() }
      // });
      
      // if (!tokenRecord) {
      //   return res.status(400).json({ error: 'Недействительный или истекший токен' });
      // }
      
      // Добавляем данные токена в запрос
      // req.tokenData = tokenRecord;
      
      next();
    } catch (error) {
      console.error('Ошибка проверки токена:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера при проверке токена' });
    }
  };
};