/// <reference types="vite/client" />

// Конфигурация API для продакшн-среды
export const API_BASE_URL = process.env.VITE_API_URL || '/api';
export const IMAGE_BASE_URL = `${API_BASE_URL}/images`;
export const ADMIN_WHITELIST = ['your@email.com']; // Список разрешенных админов

// Helper to get CSRF token from cookie
export function getCsrfToken(): string | null {
  const matches = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
  return matches ? decodeURIComponent(matches[1]) : null;
}
