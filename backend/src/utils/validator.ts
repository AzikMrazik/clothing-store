import { body, validationResult, param, query } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Создаем инстанс очистителя DOMPurify
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Валидация и санитизация данных из тела запроса
export const validateBody = (validations) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Выполняем все валидаторы
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Очищаем все строковые значения в теле запроса
    if (req.body) {
      sanitizeObject(req.body);
    }
    
    next();
  };
};

// Валидация параметров URL
export const validateParams = (validations) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Очищаем все строковые значения в параметрах
    if (req.params) {
      sanitizeObject(req.params);
    }
    
    next();
  };
};

// Валидация query-параметров
export const validateQuery = (validations) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Очищаем все строковые значения в query
    if (req.query) {
      sanitizeObject(req.query);
    }
    
    next();
  };
};

// Рекурсивная санитизация объекта
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      // Очищаем строку от потенциально вредоносного кода
      obj[key] = purify.sanitize(obj[key]);
    } else if (typeof obj[key] === 'object') {
      // Рекурсивно очищаем вложенные объекты
      sanitizeObject(obj[key]);
    }
  });
  
  return obj;
}

// Готовые валидаторы для разных типов полей
export const validators = {
  // Валидатор email
  email: body('email')
    .trim()
    .isEmail().withMessage('Некорректный email')
    .normalizeEmail({ gmail_remove_dots: false }),
  
  // Валидатор пароля
  password: body('password')
    .isLength({ min: 8 }).withMessage('Пароль должен содержать минимум 8 символов')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/)
    .withMessage('Пароль должен содержать хотя бы одну заглавную букву, одну строчную букву и одну цифру'),
  
  // Валидатор имени пользователя
  username: body('username')
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Имя пользователя должно содержать от 3 до 50 символов')
    .matches(/^[a-zA-Zа-яА-Я0-9_\-\.]+$/).withMessage('Имя пользователя может содержать только буквы, цифры, точки, дефис и знак подчёркивания'),
  
  // Валидатор ID (MongoDB ObjectId)
  id: param('id')
    .trim()
    .isMongoId().withMessage('Неверный формат ID'),
  
  // Валидатор для цены
  price: body('price')
    .isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом'),
  
  // Валидатор для строк с запретом HTML
  safeString: (field) => body(field)
    .trim()
    .isLength({ min: 1 }).withMessage(`Поле ${field} не может быть пустым`)
    .custom(value => {
      // Проверка на отсутствие HTML-тегов
      const withoutTags = value.replace(/<[^>]*>/g, '');
      if (withoutTags !== value) {
        throw new Error(`Поле ${field} не может содержать HTML-теги`);
      }
      return true;
    })
};

// Проверка на наличие SQL-инъекций
export const checkSQLInjection = (value: string): boolean => {
  const sqlPatterns = [
    /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)(\s)/i,
    /(\s|^)(UNION|OR|AND)(\s)/i,
    /'(--)'/i,
    /[;].*(--).*$/i,
    /\/\*.*\*\//i,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(value));
};