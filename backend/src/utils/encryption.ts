import crypto from 'crypto';
import { SECURITY } from '../config';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';

// Генерация случайной соли
export const generateSalt = (length = 16): string => {
  return crypto.randomBytes(length).toString('hex');
};

// Хеширование пароля с солью
export const hashPassword = (password: string, salt?: string): { hash: string; salt: string } => {
  const generatedSalt = salt || generateSalt();
  
  // Используем более стойкий PBKDF2 для хеширования паролей
  const hash = crypto.pbkdf2Sync(
    password,
    generatedSalt,
    10000, // Количество итераций
    64,    // Длина хеша
    'sha512'
  ).toString('hex');
  
  return { hash, salt: generatedSalt };
};

// Проверка пароля
export const verifyPassword = (password: string, hash: string, salt: string): boolean => {
  const { hash: candidateHash } = hashPassword(password, salt);
  return candidateHash === hash;
};

// Функция для шифрования данных
export const encryptData = (data: string, secretKey = JWT_SECRET): string => {
  // Используем алгоритм AES-256-GCM для шифрования
  const iv = crypto.randomBytes(16); // Инициализирующий вектор
  const key = crypto.scryptSync(secretKey, 'salt', 32); // Получаем ключ из секретного ключа
  
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  // Шифруем данные
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Получаем тег аутентификации
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Возвращаем зашифрованные данные, IV и тег аутентификации
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
};

// Функция для расшифровки данных
export const decryptData = (encryptedData: string, secretKey = JWT_SECRET): string => {
  // Разделяем зашифрованные данные на IV, зашифрованный текст и тег аутентификации
  const [ivHex, encrypted, authTagHex] = encryptedData.split(':');
  
  if (!ivHex || !encrypted || !authTagHex) {
    throw new Error('Некорректный формат зашифрованных данных');
  }
  
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Создаем объект для расшифровки
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    
    // Устанавливаем тег аутентификации
    decipher.setAuthTag(authTag);
    
    // Расшифровываем данные
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Ошибка расшифровки данных: данные могли быть подделаны');
  }
};

// Создание JWT токена
export const generateJWT = (payload: any, expiresIn = JWT_EXPIRY): string => {
  // Создаем заголовок
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  // Устанавливаем время истечения срока действия
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresIn;
  
  // Создаем полную полезную нагрузку с временем истечения
  const fullPayload = {
    ...payload,
    iat: now,   // Время создания
    exp: exp,   // Время истечения
    nbf: now,   // Не действителен до (начиная с текущего момента)
  };
  
  // Кодируем заголовок и полезную нагрузку в base64
  const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadBase64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  // Создаем подпись
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerBase64}.${payloadBase64}`)
    .digest('base64url');
  
  // Возвращаем собранный JWT
  return `${headerBase64}.${payloadBase64}.${signature}`;
};

// Проверка JWT токена
export const verifyJWT = (token: string): any => {
  // Разделяем токен на части
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    throw new Error('Некорректный формат JWT');
  }
  
  const [headerBase64, payloadBase64, receivedSignature] = parts;
  
  // Создаем подпись для проверки
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerBase64}.${payloadBase64}`)
    .digest('base64url');
  
  // Проверяем подпись
  if (signature !== receivedSignature) {
    throw new Error('Недействительная подпись токена');
  }
  
  // Декодируем полезную нагрузку
  const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
  
  // Проверяем срок действия
  const now = Math.floor(Date.now() / 1000);
  
  if (payload.exp && payload.exp < now) {
    throw new Error('Токен истек');
  }
  
  if (payload.nbf && payload.nbf > now) {
    throw new Error('Токен еще не действителен');
  }
  
  return payload;
};

// Генерация безопасных случайных токенов для сброса пароля или подтверждения email
export const generateSecureToken = (length = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};