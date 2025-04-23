import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

// Function to send client-side error reports to the backend
async function sendClientError(data: any) {
  try {
    await fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error('Failed to send client error report', e);
  }
}

// Глобальная обработка ошибок и отправка логов в Telegram WebView
if (navigator.userAgent.includes('Telegram')) {
  window.onerror = function(message, source, lineno, colno, error) {
    sendClientError({
      message,
      source,
      lineno,
      colno,
      stack: (error as Error)?.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
    // Suppress default Telegram script error
    return true;
  };

  window.onunhandledrejection = function(event) {
    const reason = (event as PromiseRejectionEvent).reason;
    sendClientError({
      message: reason?.message || String(reason),
      stack: reason?.stack,
      reason,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
    return true;
  };
} else {
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error caught:', { message, source, lineno, colno, error });
    const errorDiv = document.createElement('div');
    errorDiv.style.backgroundColor = '#ffdddd';
    errorDiv.style.padding = '20px';
    errorDiv.style.margin = '20px';
    errorDiv.style.border = '1px solid #ff0000';
    errorDiv.style.borderRadius = '5px';
    errorDiv.innerHTML = `<h2>Произошла ошибка</h2>
      <p>${message}</p>
      <p>Проверьте консоль браузера для получения подробной информации.</p>`;
    document.body.prepend(errorDiv);
    return false;
  };

  window.onunhandledrejection = function(event) {
    console.error('Unhandled promise rejection:', event);
    return false;
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
