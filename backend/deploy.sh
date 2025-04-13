#!/bin/bash
# Улучшенный скрипт для развертывания приложения на VPS с Ubuntu 24.04

echo "==========================================================="
echo "Скрипт развертывания для магазина одежды (Ubuntu 24.04)"
echo "==========================================================="

# Определение директорий
ROOT_DIR="/root/clothing-store"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
DOMAIN="prostor-shop.shop"
PORT=3001

# Создание директорий
echo "Создание необходимых директорий..."
mkdir -p $BACKEND_DIR
mkdir -p $FRONTEND_DIR

# Проверка и установка необходимого ПО
echo "Проверка необходимых зависимостей..."

# Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js не установлен. Устанавливаем Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo "Node.js $(node -v) установлен"
else
    echo "Node.js $(node -v) уже установлен"
fi

# MongoDB (через snap для Ubuntu 24.04)
if ! command -v mongod &> /dev/null; then
    echo "MongoDB не установлен. Устанавливаем через snap..."
    sudo snap install mongodb
    
    # Проверяем успешность установки
    if ! command -v mongo &> /dev/null && ! command -v mongosh &> /dev/null; then
        echo "MongoDB через snap не установлен. Пробуем альтернативный метод..."
        
        # Для Ubuntu 22.04 и новее пробуем jammy-репозиторий
        echo "Установка MongoDB через репозиторий для Ubuntu 22.04 (jammy)..."
        sudo apt update
        sudo apt install -y gnupg curl
        
        # Импорт ключа
        wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
        
        # Добавление репозитория для jammy
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
        
        sudo apt update
        sudo apt install -y mongodb-org
        
        # Запуск и активация MongoDB
        sudo systemctl start mongod
        sudo systemctl enable mongod
    else
        # MongoDB установлен через snap, запускаем и активируем
        echo "MongoDB установлен через snap, настраиваем..."
        sudo systemctl enable snap.mongodb.mongod
        sudo systemctl start snap.mongodb.mongod
    fi
else
    echo "MongoDB уже установлен"
fi

# Проверка статуса MongoDB
echo "Проверка статуса MongoDB..."
if systemctl is-active --quiet mongod; then
    echo "MongoDB запущен (системная служба)"
elif systemctl is-active --quiet snap.mongodb.mongod; then
    echo "MongoDB запущен (snap)"
else
    echo "Запуск MongoDB..."
    systemctl start mongod || systemctl start snap.mongodb.mongod
fi

# PM2
if ! command -v pm2 &> /dev/null; then
    echo "PM2 не установлен. Устанавливаем..."
    sudo npm install -g pm2
    echo "PM2 установлен"
else
    echo "PM2 уже установлен"
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    echo "Nginx не установлен. Устанавливаем..."
    sudo apt update
    sudo apt install -y nginx
    echo "Nginx установлен"
else
    echo "Nginx уже установлен"
fi

# Подготовка бэкенда
echo "Копирование файлов проекта..."

# Копирование .env.production в .env в директории бэкенда
if [ -f ".env.production" ]; then
    cp .env.production $BACKEND_DIR/.env
    echo "Файл .env создан из .env.production"
fi

# Установка зависимостей бэкенда
echo "Установка зависимостей бэкенда..."
cd $BACKEND_DIR
npm install express cors dotenv mongoose path fs body-parser

# Создаем файлы бэкенда, если их нет
if [ ! -d "src" ]; then
    echo "Создание базовой структуры бэкенда..."
    mkdir -p src
    
    cat > src/index.js << 'EOF'
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
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at https://${domain}/api`);
  if (fs.existsSync(FRONTEND_PATH)) {
    console.log(`Frontend available at https://${domain}`);
  }
});
EOF

    echo "Базовый файл бэкенда создан"
fi

# Сборка бэкенда
echo "Сборка бэкенда..."
mkdir -p dist
cp -r src/* dist/

# Настройка Nginx
echo "Настройка Nginx..."
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"

cat > $NGINX_CONFIG << EOF
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

# Создаем символическую ссылку
ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/

# Проверяем конфигурацию Nginx
echo "Проверка конфигурации Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    echo "Конфигурация Nginx проверена. Перезапускаем Nginx..."
    systemctl restart nginx
else
    echo "ОШИБКА: Проверка конфигурации Nginx не удалась. Проверьте синтаксис файла $NGINX_CONFIG"
fi

# Настройка файрвола
echo "Настройка файрвола..."
if command -v ufw &> /dev/null; then
    echo "UFW найден. Настройка портов..."
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow $PORT/tcp
    
    # Активация UFW, если еще не активен
    if ! ufw status | grep -q "Status: active"; then
        echo "y" | ufw enable
    fi
fi

# Запуск приложения через PM2
echo "Запуск приложения через PM2..."
cd $BACKEND_DIR
pm2 list | grep -q "$DOMAIN" && pm2 stop $DOMAIN
pm2 start dist/index.js --name $DOMAIN
pm2 save
pm2 startup

# Проверка доступности приложения
echo "Проверка доступности приложения..."
sleep 3
if ss -tulpn | grep -q ":$PORT"; then
    echo "Порт $PORT успешно прослушивается. Приложение запущено."
    echo "Ваше приложение доступно по адресу: http://$DOMAIN"
    echo "После настройки SSL используйте: https://$DOMAIN"
else
    echo "ОШИБКА: Приложение не запустилось. Проверьте логи PM2:"
    pm2 logs $DOMAIN --lines 20
fi

# Информация по настройке SSL
echo "==========================================================="
echo "ВАЖНО: Для настройки SSL выполните следующие команды:"
echo "sudo apt install certbot python3-certbot-nginx"
echo "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "==========================================================="
echo "Развертывание завершено!"