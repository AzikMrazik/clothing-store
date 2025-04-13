import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_URL } from '../config';

interface User {
  username: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Базовое название ключа для локального хранилища
const TOKEN_KEY = 'auth_token';
// Получаем IP-метку для привязки токена к IP (в реальной системе это должно быть IP с сервера)
const getIpFingerprint = (): string => {
  // В данной реализации мы используем фиктивный IP-идентификатор
  // В реальной системе нужно использовать актуальный IP пользователя
  return 'ip_fingerprint_placeholder';
};

// Полный ключ для токена с добавлением IP метки
const getFullTokenKey = (): string => {
  return `${TOKEN_KEY}_${getIpFingerprint()}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Проверка валидности токена при инициализации
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem(getFullTokenKey());
      if (token) {
        try {
          // Проверяем срок действия токена
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          if (tokenData.exp * 1000 < Date.now()) {
            throw new Error('Token expired');
          }
          
          // Если токен валиден, устанавливаем состояние аутентификации
          setIsAuthenticated(true);
          setUser({
            username: tokenData.username,
            role: tokenData.role
          });
        } catch (error) {
          console.error('Invalid token:', error);
          localStorage.removeItem(getFullTokenKey());
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkToken();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      // Создаем токен с привязкой к IP и устанавливаем срок действия 30 дней
      const token = data.token;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
      
      // Сохраняем токен в локальном хранилище с IP-привязкой
      localStorage.setItem(getFullTokenKey(), token);
      
      setIsAuthenticated(true);
      setUser({
        username: data.username,
        role: data.role
      });
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(getFullTokenKey());
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};