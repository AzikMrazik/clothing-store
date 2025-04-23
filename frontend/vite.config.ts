import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001';
  const isProd = mode === 'production';
  
  // Создаем CSP политику для защиты от XSS и других уязвимостей
  const cspPolicy = {
    'default-src': ["'self'"],
    // Добавляем 'unsafe-inline' для работы с Vite в режиме разработки
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.google-analytics.com"],
    'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    // Разрешаем загрузку изображений со всех HTTPS источников
    'img-src': ["'self'", "data:", "blob:", "https://*", "http://*"], // Разрешаем все https и http источники для изображений
    'font-src': ["'self'", "data:", "https://fonts.gstatic.com"],
    // Исправляем connect-src, чтобы он правильно работал с API
    'connect-src': ["'self'", apiUrl, "https://www.google-analytics.com", "*"],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-src': ["'self'"],
    'frame-ancestors': ["'self'"],
    'base-uri': ["'self'"]
  };
  
  // Преобразуем политику CSP в строку для заголовков
  const cspString = Object.entries(cspPolicy)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
  
  // Определяем настройки SSL для локальной разработки (если нужно)
  let httpsOptions = undefined;
  const keyPath = path.resolve(__dirname, './cert/localhost-key.pem');
  const certPath = path.resolve(__dirname, './cert/localhost.pem');
  
  if (!isProd && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  }
  
  return {
    // Принудительно устанавливаем NODE_ENV=development для вывода полных react-ошибок
    define: {
      'process.env.NODE_ENV': JSON.stringify('development')
    },
    plugins: [
      // Legacy support for older browsers (e.g., Telegram WebView)
      legacy({
        targets: ['defaults', 'not IE 11'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime']
      }),
      // Настройка плагина React с правильными параметрами для горячей перезагрузки
      react({
        // Включаем Fast Refresh для лучшей разработки
        fastRefresh: true,
        // Явно включаем JSX runtime
        jsxRuntime: 'automatic'
        // Удаляем проблемную конфигурацию Babel
      }),
      {
        name: 'security-headers',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Добавляем заголовки безопасности ко всем ответам
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
            
            // Устанавливаем CSP в режиме разработки, но только если в HTML нет CSP
            // Это предотвращает дублирование CSP правил
            if (!isProd) {
              res.setHeader('Content-Security-Policy', 
                cspString + "; script-src-attr 'unsafe-inline'");
            }
            
            next();
          });
        }
      }
    ],
    root: path.resolve(__dirname, ''),
    build: {
      outDir: 'dist',
      // Всегда генерируем source map для продакшн, чтобы дебажить ошибки
      sourcemap: true,
      // Настройки безопасности для сборки
      rollupOptions: {
        output: {
          // Разделение кода по чанкам
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@mui/material', '@emotion/react', '@emotion/styled']
          },
          // Добавление хэшей к именам файлов для кэширования
          entryFileNames: isProd ? 'assets/[name].[hash].js' : 'assets/[name].js',
          chunkFileNames: isProd ? 'assets/[name].[hash].js' : 'assets/[name].js',
          assetFileNames: isProd ? 'assets/[name].[hash].[ext]' : 'assets/[name].[ext]',
        }
      },
      // Отключаем минификацию, чтобы React ошибки были читаемыми
      minify: false,
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        format: {
          comments: false
        }
      } : undefined
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      // Настройки прокси
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: isProd, // В продакшн режиме требуем SSL
          // Убираем rewrite, чтобы сохранить префикс /api
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxy request:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Proxy response:', proxyRes.statusCode, req.url);
            });
          }
        }
      },
      cors: true,
      hmr: {
        // Проверяем целостность для HMR
        clientPort: 5173,
        overlay: true
      },
      // Добавляем HTTPS если есть сертификаты
      https: httpsOptions
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    // Настройки для различных окружений
    esbuild: {
      // Минифицируем только в продакшн
      minifyIdentifiers: isProd,
      minifySyntax: isProd,
      minifyWhitespace: isProd,
      // Удаляем console.log в продакшн
      drop: isProd ? ['console', 'debugger'] : []
    }
  };
});
