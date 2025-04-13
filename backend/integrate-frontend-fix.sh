#!/bin/bash
# Скрипт для интеграции фронтенда с бэкендом и исправления временной тестовой страницы
# Исправлена проблема с подстановкой переменных в heredoc

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка прав суперпользователя
if [ "$EUID" -ne 0 ]; then
    print_error "Запустите скрипт с правами суперпользователя (sudo)"
    exit 1
fi

# Определение директорий и переменных с правильным путем
BACKEND_DIR="/root/clothing-store/backend"
FRONTEND_DIR="/root/clothing-store/frontend"
PORT=3001
APP_NAME="clothing-store"
DOMAIN="prostor-shop.shop"

print_message "Интеграция фронтенда с бэкендом для приложения $APP_NAME"

# Шаг 1: Проверка директорий
print_message "Проверка директорий..."
if [ ! -d "$BACKEND_DIR" ]; then
    print_error "Директория бэкенда $BACKEND_DIR не существует. Проверьте путь."
    exit 1
else
    print_message "Директория бэкенда найдена."
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    print_warning "Директория фронтенда $FRONTEND_DIR не существует. Проверьте путь."
    read -p "Хотите создать директорию фронтенда? (y/n): " CREATE_FRONTEND
    if [[ "$CREATE_FRONTEND" == "y" || "$CREATE_FRONTEND" == "Y" ]]; then
        mkdir -p $FRONTEND_DIR
        print_message "Директория фронтенда создана."
    else
        print_error "Без директории фронтенда невозможно продолжить интеграцию."
        exit 1
    fi
else
    print_message "Директория фронтенда найдена."
fi

# Шаг 2: Сборка фронтенда, если это возможно
FRONTEND_BUILT=false
if [ -f "$FRONTEND_DIR/package.json" ]; then
    print_message "Проверка возможности сборки фронтенда..."
    cd $FRONTEND_DIR
    
    # Проверка наличия скрипта сборки (build)
    if grep -q '"build"' "package.json"; then
        print_message "Найден скрипт build в package.json. Устанавливаем зависимости и собираем фронтенд..."
        npm install
        
        # Создание или обновление .env для фронтенда
        print_message "Создание .env для фронтенда с правильным API URL..."
        echo "VITE_API_URL=https://$DOMAIN/api" > .env
        
        # Сборка фронтенда
        npm run build
        
        if [ $? -ne 0 ]; then
            print_error "Ошибка при сборке фронтенда. Проверьте логи выше."
        else
            print_message "Фронтенд успешно собран."
            
            # Проверка наличия собранных файлов
            if [ -d "dist" ]; then
                print_message "Директория dist найдена. Проверка наличия index.html..."
                if [ -f "dist/index.html" ]; then
                    print_message "Файл dist/index.html найден. Фронтенд готов к интеграции."
                    FRONTEND_BUILT=true
                else
                    print_error "Файл dist/index.html не найден. Сборка некорректна."
                fi
            else
                print_error "Директория dist не найдена. Сборка фронтенда не выполнена."
            fi
        fi
    else
        print_warning "Скрипт build не найден в package.json фронтенда. Невозможно собрать автоматически."
    fi
else
    print_warning "Файл package.json не найден в $FRONTEND_DIR. Невозможно собрать фронтенд."
fi

# Шаг 3: Обновление файла index.js бэкенда для обслуживания фронтенда
print_message "Обновление index.js бэкенда для обслуживания фронтенда..."
cd $BACKEND_DIR

# Создаем временную директорию dist, если не существует
if [ ! -d "dist" ]; then
    print_message "Создаем директорию dist для бэкенда..."
    mkdir -p dist
fi

# Создание файла со всеми настройками
if [ "$FRONTEND_BUILT" = true ]; then
    print_message "Обновляем index.js для использования собранного фронтенда..."
    cat > dist/index.js << 'EOF'
const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('fs');

// Загрузка переменных окружения из .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const domain = process.env.DOMAIN || "prostor-shop.shop";

// Настройка CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [`https://${domain}`, `https://www.${domain}`],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  maxAge: 86400
};
app.use(cors(corsOptions));

// Парсинг JSON-запросов
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Подключение к MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clothing-store';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    // Не останавливаем сервер, если нет подключения к БД
    console.log('Running without database connection');
  });

// Базовые API-маршруты для тестирования
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/products', (req, res) => {
  res.json({ 
    products: [
      { id: 1, name: 'Футболка', price: 1200, description: 'Комфортная футболка из 100% хлопка' },
      { id: 2, name: 'Джинсы', price: 2500, description: 'Классические джинсы' },
      { id: 3, name: 'Куртка', price: 5000, description: 'Демисезонная куртка' }
    ] 
  });
});

// Путь к директории со статическими файлами фронтенда
const FRONTEND_PATH = "/root/clothing-store/frontend/dist";

// Проверяем наличие статических файлов
if (fs.existsSync(FRONTEND_PATH)) {
  console.log(`Serving frontend from ${FRONTEND_PATH}`);
  
  // Сервируем статические файлы фронтенда
  app.use(express.static(FRONTEND_PATH));
  
  // Все остальные GET-запросы перенаправляем на index.html для работы SPA
  app.get('*', (req, res) => {
    // Исключаем API-запросы
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
    }
  });
} else {
  console.log('Frontend directory not found, serving API only');
  
  // Если фронтенда нет, показываем информационную страницу
  app.get('/', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Clothing Store API</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
            h1 { color: #333; }
            .container { max-width: 800px; margin: 0 auto; }
            .info { background-color: #f5f5f5; padding: 15px; border-radius: 5px; }
            .endpoint { margin-bottom: 10px; padding: 10px; background-color: #e9e9e9; border-radius: 3px; }
            .endpoint code { background-color: #ddd; padding: 2px 4px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Clothing Store API</h1>
            <div class="info">
              <p>The API is running. Frontend is not yet integrated.</p>
              <p>Available endpoints:</p>
              <div class="endpoint">
                <code>GET /api/health</code> - Check API health
              </div>
              <div class="endpoint">
                <code>GET /api/products</code> - Get sample products
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at https://${domain}/api`);
  if (fs.existsSync(FRONTEND_PATH)) {
    console.log(`Frontend available at https://${domain}`);
  }
});
EOF
else
    print_message "Создаем улучшенную временную версию index.js для API и базовой страницы..."
    cat > dist/index.js << 'EOF'
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Загрузка переменных окружения из .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const domain = process.env.DOMAIN || "prostor-shop.shop";

// Настройка CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [`https://${domain}`, `https://www.${domain}`],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  maxAge: 86400
};
app.use(cors(corsOptions));

// Парсинг JSON-запросов
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Подключение к MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clothing-store';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    // Не останавливаем сервер, если нет подключения к БД
    console.log('Running without database connection');
  });

// Базовые API-маршруты для тестирования
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/products', (req, res) => {
  res.json({ 
    products: [
      { id: 1, name: 'Футболка', price: 1200, description: 'Комфортная футболка из 100% хлопка' },
      { id: 2, name: 'Джинсы', price: 2500, description: 'Классические джинсы' },
      { id: 3, name: 'Куртка', price: 5000, description: 'Демисезонная куртка' }
    ] 
  });
});

// Для запросов не к API показываем страницу-заглушку с информацией
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>${domain} - Магазин одежды</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #333; line-height: 1.6; }
          header { background: #2c3e50; color: white; padding: 2rem 0; text-align: center; }
          .container { width: 80%; margin: 0 auto; }
          .info-card { background: #f8f9fa; border-radius: 5px; padding: 2rem; margin: 2rem 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          h1 { margin: 0; font-size: 2.5rem; }
          h2 { color: #2c3e50; }
          .api-endpoints { background: #e9ecef; padding: 1rem; border-radius: 4px; margin-top: 1rem; }
          .endpoint { margin: 10px 0; padding: 5px; }
          code { background: #d6d8db; padding: 2px 5px; border-radius: 3px; }
          .btn { display: inline-block; background: #2c3e50; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; margin-top: 1rem; }
          footer { background: #2c3e50; color: white; text-align: center; padding: 1rem 0; margin-top: 2rem; }
        </style>
      </head>
      <body>
        <header>
          <div class="container">
            <h1>Магазин одежды ${domain}</h1>
            <p>Интернет-магазин стильной одежды на любой вкус</p>
          </div>
        </header>
        
        <div class="container">
          <div class="info-card">
            <h2>Информация о сайте</h2>
            <p>Сайт находится в стадии разработки. Веб-интерфейс будет доступен в ближайшее время.</p>
            <p>Пока вы можете проверить работу API:</p>
            
            <div class="api-endpoints">
              <h3>Доступные API endpoints:</h3>
              <div class="endpoint">
                <code>GET /api/health</code> - Проверка статуса API
              </div>
              <div class="endpoint">
                <code>GET /api/products</code> - Получение списка товаров
              </div>
            </div>
            
            <a href="/api/products" class="btn">Проверить API</a>
          </div>
        </div>
        
        <footer>
          <div class="container">
            &copy; ${new Date().getFullYear()} ${domain} - Все права защищены
          </div>
        </footer>
      </body>
    </html>
  `);
});

// Обработка всех других маршрутов
app.get('*', (req, res) => {
  // Если запрос к API - возвращаем 404 JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Иначе редирект на главную
  res.redirect('/');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at https://${domain}/api`);
  console.log(`Temporary homepage available at https://${domain}`);
});
EOF
fi

# Добавляем переменную DOMAIN в .env файл бэкенда
print_message "Обновляем .env файл бэкенда с переменной DOMAIN..."
if [ -f ".env" ]; then
    if ! grep -q "DOMAIN=" .env; then
        echo "DOMAIN=$DOMAIN" >> .env
        print_message "Переменная DOMAIN добавлена в .env"
    fi
else
    echo "DOMAIN=$DOMAIN" > .env
    print_message "Создан новый .env файл с переменной DOMAIN"
fi

# Шаг 4: Установка зависимостей для бэкенда
print_message "Установка необходимых зависимостей для бэкенда..."
cd $BACKEND_DIR
npm install express cors dotenv mongoose path fs

# Шаг 5: Обновление конфигурации Nginx
print_message "Обновление конфигурации Nginx для правильного проксирования запросов..."
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"

if [ -f "$NGINX_CONFIG" ]; then
    print_message "Файл конфигурации Nginx найден. Обновляем конфигурацию..."
    
    # Создаем резервную копию
    cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d%H%M%S)"
    
    # Создаем новую конфигурацию
    cat > "$NGINX_CONFIG" << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Для кэширования статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:$PORT;
        proxy_cache_valid 200 30d;
        proxy_cache_bypass \$http_cache_control;
        add_header Cache-Control "public, max-age=31536000";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Gzip
    gzip on;
    gzip_disable "msie6";
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        application/atom+xml
        application/geo+json
        application/javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rdf+xml
        application/rss+xml
        application/vnd.ms-fontobject
        application/wasm
        application/x-font-ttf
        application/x-javascript
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/eot
        font/opentype
        font/otf
        font/ttf
        image/bmp
        image/svg+xml
        image/vnd.microsoft.icon
        image/x-icon
        text/cache-manifest
        text/css
        text/javascript
        text/plain
        text/vcard
        text/vnd.rim.location.xloc
        text/vtt
        text/x-component
        text/x-cross-domain-policy
        text/xml;
}
EOF
    
    print_message "Проверка синтаксиса обновленной конфигурации Nginx..."
    nginx -t
    
    if [ $? -eq 0 ]; then
        print_message "Синтаксис Nginx верен. Перезапускаем Nginx..."
        systemctl restart nginx
    else
        print_error "Ошибка в синтаксисе Nginx. Восстанавливаем из предыдущей резервной копии..."
        cp "$NGINX_CONFIG.backup.$(date +%Y%m%d%H%M%S)" "$NGINX_CONFIG"
        print_error "Требуется ручная проверка конфигурации Nginx."
    fi
else
    print_error "Файл конфигурации Nginx для $DOMAIN не найден. Требуется сначала настроить Nginx."
fi

# Шаг 6: Перезапуск приложения в PM2
print_message "Перезапуск приложения в PM2..."
cd $BACKEND_DIR
if pm2 list | grep -q "$APP_NAME"; then
    pm2 restart $APP_NAME
else
    pm2 start dist/index.js --name $APP_NAME
fi

pm2 save

# Шаг 7: Проверка обновленного приложения
print_message "Проверка статуса обновленного приложения..."
sleep 3

if ss -tulpn | grep -q ":$PORT"; then
    print_message "Порт $PORT прослушивается. Проверка доступности API..."
    
    # Проверка доступности API
    if command -v curl &> /dev/null; then
        API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/health)
        if [ "$API_STATUS" = "200" ]; then
            print_message "API работает корректно (HTTP $API_STATUS)"
        else
            print_warning "API может быть недоступен (HTTP $API_STATUS)"
        fi
    else
        print_warning "curl не установлен, невозможно проверить доступность API."
    fi
else
    print_error "Порт $PORT не прослушивается. Проверьте логи PM2:"
    pm2 logs $APP_NAME --lines 20
fi

# Шаг 8: Завершающее сообщение
print_message "==============================================="
print_message "Интеграция фронтенда с бэкендом завершена!"
print_message "==============================================="
if [ "$FRONTEND_BUILT" = true ]; then
    print_message "Фронтенд успешно собран и интегрирован с бэкендом."
else
    print_message "Создана улучшенная временная страница."
    print_message "Для полноценной интеграции фронтенда выполните:"
    print_message "1. Убедитесь, что фронтенд-часть готова к сборке"
    print_message "2. Запустите скрипт заново"
fi
print_message "-----------------------------------------------"
print_message "Ваш сайт доступен по адресу:"
print_message "https://$DOMAIN"
print_message "API доступен по адресу:"
print_message "https://$DOMAIN/api"
print_message "-----------------------------------------------"
print_message "Для просмотра логов приложения выполните:"
print_message "pm2 logs $APP_NAME"
print_message "==============================================="