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
  
  // Ensure production env is configured
  if (isProd && !env.VITE_API_URL) {
    throw new Error('VITE_API_URL must be set in production');
  }
  
  // Создаем CSP политику для защиты от XSS и других уязвимостей
  // Tighten CSP for production: remove unsafe-inline and unsafe-eval
  const cspPolicy = {
    'default-src': ["'self'"],
    'script-src': isProd ? ["'self'", "https://www.google-analytics.com"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.google-analytics.com"],
    'style-src': isProd ? ["'self'", "https://fonts.googleapis.com"] : ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    'img-src': ["'self'", "data:", "blob:", "https:"],
    'font-src': ["'self'", "data:", "https://fonts.gstatic.com"],
    'connect-src': ["'self'", apiUrl, "https://www.google-analytics.com"],
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
    // Dynamically set NODE_ENV based on mode
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    plugins: [
      // Legacy support for older browsers (e.g., Telegram WebView)
      legacy({
        targets: ['defaults', 'not IE 11'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime']
      }),
      // Настройка плагина React с правильными параметрами для горячей перезагрузки
      react({
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
            res.setHeader('Referrer-Policy', 'no-referrer');
            res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
            
            // Устанавливаем CSP в режиме разработки, но только если в HTML нет CSP
            // Это предотвращает дублирование CSP правил
            if (!isProd) {
              res.setHeader('Content-Security-Policy', 
                cspString + "; script-src-attr 'unsafe-inline'");
            }
            
            next();
          });
        },
        configurePreview(server) {
          server.middlewares.use((req, res, next) => {
            // Добавляем CORS-заголовки для сервера preview
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,POST,DELETE,OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Referrer-Policy', 'no-referrer');
            // Устанавливаем CSP по HTTP заголовкам в preview
            res.setHeader('Content-Security-Policy', cspString);
            next();
          });
        }
      }
    ],
    root: path.resolve(__dirname, ''),
    build: {
      outDir: 'dist',
      // Disable sourcemaps in production to prevent code exposure
      sourcemap: isProd ? false : true,
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
    preview: {
      host: '0.0.0.0',
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,PUT,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': cspString
      }
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
