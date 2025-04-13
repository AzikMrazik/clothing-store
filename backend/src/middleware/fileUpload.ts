import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import { logSecurityEvent, SecurityEventType } from '../utils/logger';

// Получаем максимальный размер файла из переменных окружения или используем значение по умолчанию
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE 
  ? parseInt(process.env.MAX_FILE_SIZE) 
  : 5 * 1024 * 1024; // 5MB по умолчанию

// Получаем разрешенные типы файлов
const ALLOWED_FILE_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp')
  .split(',');

// Настройка хранилища для загруженных файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Создаем папку назначения, если её нет
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Генерируем безопасное имя файла, чтобы предотвратить перезапись и путь травесирования
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const fileExtension = path.extname(file.originalname);
    
    // Проверяем расширение файла
    const safeExtension = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(fileExtension.toLowerCase()) 
      ? fileExtension.toLowerCase() 
      : '.bin'; // Если расширение не распознано, используем .bin
    
    // Безопасное имя файла
    const safeFileName = `${Date.now()}-${uniqueSuffix}${safeExtension}`;
    
    cb(null, safeFileName);
  }
});

// Функция для проверки типа файла
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Проверяем MIME-тип файла
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    // Проверка магических чисел для дополнительной безопасности
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый тип файла. Разрешены только: ' + ALLOWED_FILE_TYPES.join(', ')));
  }
};

// Настройка multer с ограничениями
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5 // Максимальное количество файлов за один запрос
  }
});

// Middleware для обработки ошибок загрузки файлов
export const handleFileUploadErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // Ошибки multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: `Файл слишком большой. Максимальный размер файла: ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`
      });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Слишком много файлов. Максимум 5 файлов за один запрос.'
      });
    } else {
      return res.status(400).json({ error: `Ошибка загрузки файла: ${err.message}` });
    }
  } else if (err) {
    // Другие ошибки
    return res.status(400).json({ error: err.message });
  }
  
  next();
};

// Middleware для дополнительной проверки безопасности загруженных файлов
export const validateUploadedFiles = async (req: Request, res: Response, next: NextFunction) => {
  // Если нет файлов, просто продолжаем
  if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
    return next();
  }
  
  try {
    // Получаем файлы (может быть массив или объект)
    const files = Array.isArray(req.files) 
      ? req.files 
      : Object.values(req.files as Record<string, Express.Multer.File[]>).flat();
    
    // Проходим по всем файлам и выполняем дополнительную проверку
    for (const file of files) {
      // Проверяем фактический тип файла по его содержимому (магические числа)
      const isValid = await validateFileType(file.path, file.mimetype);
      
      if (!isValid) {
        // Удаляем файл, если он не прошел проверку
        fs.unlinkSync(file.path);
        
        // Логируем подозрительную активность
        logSecurityEvent(
          SecurityEventType.FILE_UPLOAD,
          'Suspicious file upload detected',
          {
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size
          },
          req
        );
        
        return res.status(400).json({ 
          error: 'Недопустимый тип файла. Содержимое файла не соответствует заявленному типу.'
        });
      }
      
      // Проверяем на вирусы (если есть API антивируса)
      // В реальном приложении здесь может быть вызов антивирусного API
      
      // Дополнительная проверка для изображений
      if (file.mimetype.startsWith('image/')) {
        // Здесь можно добавить проверку размеров изображения и другие проверки
      }
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Ошибка проверки загруженных файлов' });
  }
};

// Функция для проверки типа файла по его содержимому
async function validateFileType(filePath: string, mimeType: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Читаем первые байты файла для определения типа
    const fileStream = fs.createReadStream(filePath, { start: 0, end: 8 });
    const chunks: Buffer[] = [];
    
    fileStream.on('data', (chunk) => {
      // Ensure chunk is a Buffer before adding to the array
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (typeof chunk === 'string') {
        // Convert string to Buffer if needed
        chunks.push(Buffer.from(chunk));
      }
    });
    
    fileStream.on('end', () => {
      const header = Buffer.concat(chunks);
      
      // Проверяем сигнатуры файлов
      if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        // JPEG начинается с FF D8
        resolve(header[0] === 0xFF && header[1] === 0xD8);
      } else if (mimeType === 'image/png') {
        // PNG начинается с 89 50 4E 47 0D 0A 1A 0A
        resolve(
          header[0] === 0x89 && 
          header[1] === 0x50 && 
          header[2] === 0x4E && 
          header[3] === 0x47
        );
      } else if (mimeType === 'image/webp') {
        // WebP начинается с RIFF....WEBP
        resolve(
          header.slice(0, 4).toString() === 'RIFF' && 
          header.slice(8, 12).toString() === 'WEBP'
        );
      } else if (mimeType === 'application/pdf') {
        // PDF начинается с %PDF-
        resolve(header.slice(0, 5).toString() === '%PDF-');
      } else {
        // Для других типов файлов - просто разрешаем
        resolve(true);
      }
    });
    
    fileStream.on('error', () => {
      resolve(false);
    });
  });
}