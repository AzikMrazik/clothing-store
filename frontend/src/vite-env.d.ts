/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // Добавьте здесь другие переменные окружения, если они используются
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}