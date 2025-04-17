import React, { useEffect } from 'react';
import securityService from '../services/security';
import { SECURITY } from '../config';

/**
 * Компонент для инициализации всех механизмов безопасности
 */
const SecurityInitializer: React.FC = () => {
  useEffect(() => {
    // Инициализируем все механизмы безопасности при монтировании компонента
    try {
      // Отложенная инициализация для снижения вероятности блокировки рендеринга
      setTimeout(() => {
        try {
          // Инициализируем безопасность
          initSecurity();
        } catch (err) {
          console.error('Ошибка при инициализации системы безопасности:', err);
        }
      }, 0);
    } catch (error) {
      console.error('Критическая ошибка при инициализации системы безопасности:', error);
    }
  }, []);

  /**
   * Инициализация всех механизмов безопасности
   */
  const initSecurity = () => {
    try {
      // Устанавливаем политики безопасности контента (CSP)
      securityService.setupSecurityPolicies();
      
      // Запускаем мониторинг безопасности
      securityService.setupSecurityMonitoring();
      
      // Выполняем дополнительные настройки безопасности
      setupAdditionalSecurity();
    } catch (error) {
      console.error('Ошибка при инициализации безопасности:', error);
      throw error; // Пробрасываем ошибку выше для обработки
    }
  };

  /**
   * Дополнительные настройки безопасности
   */
  const setupAdditionalSecurity = () => {
    // Защита от кликджекинга, но пропускаем Telegram WebView
    const ua = navigator.userAgent.toLowerCase();
    const anyWin = window as any;
    const inTelegramWebView = ua.includes('telegram') || (!!anyWin.Telegram && !!anyWin.Telegram.WebApp);
    if (window.self !== window.top && window.location.hostname !== 'localhost' && !inTelegramWebView) {
      console.warn('Сайт загружен в iframe. Возможна атака кликджекинга.');
      document.body.style.display = 'none';
    }
    
    // Отключение консоли для продакшн-среды (защита от злоумышленников)
    if (process.env.NODE_ENV === 'production') {
      disableConsoleInProduction();
    }
    
    // Защита от утечки данных через referrer
    const referrerPolicy = document.createElement('meta');
    referrerPolicy.name = 'referrer';
    referrerPolicy.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(referrerPolicy);
    
    // Предотвращение обнаружения с помощью DNS prefetching
    const dnsPrefetch = document.createElement('meta');
    dnsPrefetch.httpEquiv = 'x-dns-prefetch-control';
    dnsPrefetch.content = 'off';
    document.head.appendChild(dnsPrefetch);
  };

  /**
   * Отключение консоли браузера в производственной среде
   * Защищает от простых скриптов-вредоносов и меньше шансов для XSS
   */
  const disableConsoleInProduction = () => {
    if (!SECURITY.DISABLE_CONSOLE_IN_PRODUCTION) return;
    
    try {
      // Сохраняем оригинальные методы для возможности отладки
      const consoleOriginal = { ...console };
      
      // Переопределяем методы консоли
      console.log = () => {};
      console.info = () => {};
      console.warn = () => {};
      console.error = () => {};
      console.debug = () => {};
      
      // Но оставляем возможность восстановить консоль для отладки
      (window as any)['_restoreConsole'] = () => {
        Object.assign(console, consoleOriginal);
      };
    } catch (e) {
      // В случае ошибки просто продолжаем работу
    }
  };

  // Этот компонент не рендерит ничего на странице
  return null;
};

export default SecurityInitializer;