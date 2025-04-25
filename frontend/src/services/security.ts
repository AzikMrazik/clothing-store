import { SECURITY } from '../config';
// Исправляем импорт DOMPurify
import DOMPurify from 'dompurify';

// Импорт настроек мониторинга
import { MONITORING } from '../config';

// Класс для работы с безопасностью на фронтенде
class SecurityService {
  // Очистка потенциально опасного HTML
  sanitizeHTML(content: string): string {
    try {
      // Проверка, что DOMPurify правильно инициализирован
      if (!DOMPurify || typeof DOMPurify.sanitize !== 'function') {
        console.error('DOMPurify не инициализирован правильно');
        return content; // Возвращаем исходный контент вместо пустой строки
      }
      
      return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      });
    } catch (error) {
      console.error('Ошибка при санитизации HTML:', error);
      return content; // В случае ошибки возвращаем исходный контент
    }
  }

  // Защита от XSS при вставке данных в DOM
  secureInsertHTML(element: HTMLElement, content: string): void {
    const sanitizedContent = this.sanitizeHTML(content);
    element.innerHTML = sanitizedContent;
  }

  // Защита от XSS для текстового содержимого
  secureInsertText(element: HTMLElement, content: string): void {
    element.textContent = content;
  }

  // Получение CSRF токена из cookie
  getCSRFToken(): string | null {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='));
    
    return cookieValue ? cookieValue.split('=')[1] : null;
  }

  // Безопасное хранение данных в localStorage с шифрованием
  secureStore(key: string, value: any): void {
    try {
      // Шифруем данные перед сохранением (простое шифрование для примера)
      const encryptedData = this.encryptData(JSON.stringify(value));
      localStorage.setItem(key, encryptedData);
    } catch (error) {
      console.error('Ошибка при безопасном сохранении данных:', error);
    }
  }

  // Получение защищенных данных из localStorage
  secureRetrieve(key: string): any {
    try {
      const encryptedData = localStorage.getItem(key);
      if (!encryptedData) return null;
      
      // Расшифровываем данные
      const decryptedData = this.decryptData(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Ошибка при получении защищенных данных:', error);
      // При ошибке расшифровки удаляем поврежденные данные
      localStorage.removeItem(key);
      return null;
    }
  }

  // Простое шифрование для хранения в localStorage
  // Примечание: это не криптографически стойкое шифрование,
  // только базовая защита от простого просмотра
  private encryptData(data: string): string {
    // Простое шифрование для демонстрации
    // В реальном приложении используйте более стойкие алгоритмы
    const secretKey = 'frontend-secret-key'; // В реальном приложении должен быть уникальным
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const keyBytes = encoder.encode(secretKey);
    
    // XOR шифрование
    const encryptedBytes = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      encryptedBytes[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return btoa(String.fromCharCode(...encryptedBytes));
  }

  // Расшифровка данных из localStorage
  private decryptData(encryptedData: string): string {
    const secretKey = 'frontend-secret-key';
    const encryptedBytes = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    const keyBytes = new TextEncoder().encode(secretKey);
    
    // XOR расшифровка
    const decryptedBytes = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decryptedBytes[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(decryptedBytes);
  }

  // Обнаружение потенциальных атак и манипуляций с DOM
  setupSecurityMonitoring(): void {
    // Мониторинг изменений DOM для обнаружения потенциальных атак XSS
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLElement) {
              // Проверяем на наличие подозрительных скриптов или событий
              if (
                node.tagName === 'SCRIPT' || 
                node.hasAttribute('onload') || 
                node.hasAttribute('onerror')
              ) {
                console.warn('Обнаружена потенциальная XSS атака:', node);
                
                // В реальном приложении здесь можно отправить данные о попытке атаки
                if (MONITORING.ENABLED && MONITORING.REPORT_ERRORS) {
                  this.reportSecurityIssue({
                    type: 'xss-attempt',
                    details: {
                      element: node.outerHTML,
                      url: window.location.href,
                      timestamp: new Date().toISOString()
                    }
                  });
                }
              }
            }
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Защита от кликджекинга
    if (window.self !== window.top) {
      // Страница загружена в iframe, возможна атака кликджекинга
      console.warn('Возможная атака кликджекинга: сайт загружен в iframe');
      document.body.style.display = 'none';
    }
  }

  // Отправка сообщений о проблемах безопасности на сервер
  reportSecurityIssue(issueData: any): void {
    const { ERROR_ENDPOINT } = MONITORING;
    
    fetch(ERROR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Добавляем CSRF токен для защиты
        'X-CSRF-Token': this.getCSRFToken() || '',
      },
      body: JSON.stringify(issueData),
    }).catch(err => {
      console.error('Не удалось отправить отчет о проблеме безопасности:', err);
    });
  }
  
  // Устанавливает политики безопасности для защиты от XSS
  setupSecurityPolicies(): void {
    // CSP уже определена в HTML-файле, поэтому метод теперь только логирует информацию
    console.log('CSP определена в HTML файле. Динамическая установка отключена.');
    
    // Добавление других политик безопасности, если необходимо
    // Например, добавление X-Frame-Options, если не установлено через сервер
    // X-Frame-Options should be delivered via HTTP headers by the server
    // Meta tags for X-Frame-Options removed to comply with browser requirements
  }
}

// Создаем экземпляр сервиса безопасности
const securityService = new SecurityService();

export default securityService;