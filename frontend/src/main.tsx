import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

// Setup robust global error listeners as early as possible
console.log('Initializing global error handlers');

// Always throw a test error after 3 seconds to verify global handler
setTimeout(() => {
  console.log('Throwing test error to verify global handler');
  alert('Test Error Handler: throwing now');
  throw new Error('Test client error for verifying handler');
}, 3000);

// Base URL for API calls, set via Vite env
const API_BASE = import.meta.env.VITE_API_URL || '';

async function _reportError(data: any) {
  console.log('Reporting error data to server:', data);
  try {
    await fetch(`${window.location.origin}/api/client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error('Failed to send client error report', e);
  }
}

window.addEventListener('error', (event) => {
  console.log('Global error event caught:', event);
  _reportError({
    message: event.message,
    filename: (event as any).filename || event.filename,
    lineno: (event as any).lineno || event.lineno,
    colno: (event as any).colno || event.colno,
    stack: (event.error as Error)?.stack,
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString()
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.log('Unhandled promise rejection event caught:', event);
  const reason = (event as PromiseRejectionEvent).reason;
  _reportError({
    message: reason?.message || String(reason),
    stack: reason?.stack,
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString()
  });
});

// Alias sendClientError to unified reporter for consistent logs
const sendClientError = _reportError;

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
