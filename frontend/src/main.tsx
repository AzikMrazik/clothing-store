import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

// Глобальная обработка ошибок и подавление их в Telegram WebView
if (navigator.userAgent.includes('Telegram')) {
  window.onerror = () => true;
  window.onunhandledrejection = () => true;
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
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
