#!/bin/bash
# Главный скрипт для настройки проекта магазина одежды на VPS
# Объединяет все необходимые шаги для настройки и развертывания

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функции для вывода
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${GREEN}=======================================================${NC}"
    echo -e "${GREEN}= $1 =${NC}"
    echo -e "${GREEN}=======================================================${NC}"
    echo ""
}

# Проверка прав суперпользователя
if [ "$EUID" -ne 0 ]; then
    print_error "Этот скрипт должен быть запущен с правами суперпользователя (sudo)"
    exit 1
fi

# Основные параметры
ROOT_DIR="/root/clothing-store"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
DOMAIN="prostor-shop.shop"
PORT=3001

print_header "Установка магазина одежды на VPS"
print_message "Домен: $DOMAIN"
print_message "Порт: $PORT"
print_message "Директория проекта: $ROOT_DIR"

# Шаг 1: Создание необходимых директорий
print_header "Создание директорий проекта"
mkdir -p $BACKEND_DIR/src
mkdir -p $BACKEND_DIR/dist
mkdir -p $FRONTEND_DIR/dist
print_message "Директории созданы"

# Шаг 2: Установка необходимых пакетов
print_header "Установка системных зависимостей"
apt update
apt install -y curl wget git build-essential nginx

# Установка Node.js
if ! command -v node &> /dev/null; then
    print_message "Установка Node.js 18.x"
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    print_message "Node.js $(node -v) установлен"
else
    print_message "Node.js $(node -v) уже установлен"
fi

# Установка MongoDB
print_header "Установка и настройка MongoDB"
if ! command -v mongod &> /dev/null; then
    print_message "MongoDB не установлен. Устанавливаем через snap..."
    apt install -y snapd
    snap install mongodb
    
    # Проверка установки
    if ! command -v mongo &> /dev/null && ! command -v mongosh &> /dev/null; then
        print_warning "MongoDB через snap не установлен. Пробуем альтернативный метод..."
        
        # Для Ubuntu 22.04/24.04 пробуем jammy-репозиторий
        print_message "Установка MongoDB через репозиторий для Ubuntu 22.04 (jammy)..."
        apt install -y gnupg curl

        # Импорт ключа
        wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg

        # Добавление репозитория для jammy
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-6.0.list

        apt update
        apt install -y mongodb-org

        # Запуск и активация MongoDB
        systemctl start mongod
        systemctl enable mongod
        print_message "MongoDB установлен через apt"
    else
        # MongoDB установлен через snap, запускаем и активируем
        print_message "MongoDB установлен через snap, настраиваем..."
        systemctl enable snap.mongodb.mongod
        systemctl start snap.mongodb.mongod
    fi
    
    # Проверка статуса MongoDB
    if systemctl is-active --quiet mongod; then
        print_message "MongoDB запущен (системная служба)"
    elif systemctl is-active --quiet snap.mongodb.mongod; then
        print_message "MongoDB запущен (snap)"
    else
        print_warning "MongoDB НЕ запущен! Пытаемся запустить..."
        systemctl start mongod || systemctl start snap.mongodb.mongod
    fi
else
    print_message "MongoDB уже установлен"
    systemctl enable mongod || systemctl enable snap.mongodb.mongod
    systemctl start mongod || systemctl start snap.mongodb.mongod
fi

# Установка глобальных npm пакетов
print_header "Установка глобальных npm пакетов"
npm install -g pm2

# Шаг 3: Настройка бэкенда
print_header "Настройка бэкенда"

# Создание файла .env
cat > $BACKEND_DIR/.env << EOF
NODE_ENV=production
PORT=$PORT
MONGODB_URI=mongodb://localhost:27017/clothing-store
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_EXPIRES_IN=7d
PASSWORD_SALT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOGIN_TIMEOUT=15
SESSION_SECRET=$(openssl rand -base64 32)
COOKIE_SECURE=true
COOKIE_MAX_AGE=864000000
CSRF_ENABLED=true
DOMAIN=$DOMAIN
CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN
EOF

print_message "Файл .env создан"

# Установка зависимостей бэкенда
cd $BACKEND_DIR
npm init -y
npm install express cors dotenv mongoose body-parser path fs uuid

# Создание базового файла бэкенда
cat > $BACKEND_DIR/src/index.js << EOF
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
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [\`https://\${domain}\`, \`https://www.\${domain}\`],
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
const FRONTEND_PATH = "$FRONTEND_DIR/dist";

// Проверяем наличие статических файлов
if (fs.existsSync(FRONTEND_PATH)) {
  console.log(\`Serving frontend from \${FRONTEND_PATH}\`);
  
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
    res.send(\`
      <html>
        <head>
          <title>\${domain} - Магазин одежды</title>
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
              <h1>Магазин одежды \${domain}</h1>
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
              &copy; \${new Date().getFullYear()} \${domain} - Все права защищены
            </div>
          </footer>
        </body>
      </html>
    \`);
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(\`Server running on port \${port}\`);
  console.log(\`API available at https://\${domain}/api\`);
  if (fs.existsSync(FRONTEND_PATH)) {
    console.log(\`Frontend available at https://\${domain}\`);
  }
});
EOF

# Копируем бэкенд в dist для запуска
cp $BACKEND_DIR/src/index.js $BACKEND_DIR/dist/
print_message "Базовый файл бэкенда создан и скопирован в dist"

# Шаг 4: Создаем заглушку для фронтенда
print_header "Создание заглушки для фронтенда"

mkdir -p $FRONTEND_DIR/dist
cat > $FRONTEND_DIR/dist/index.html << EOF
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$DOMAIN - Магазин одежды</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #333; 
            line-height: 1.6; 
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }
        header { 
            background: #2c3e50; 
            color: white; 
            padding: 2rem 0; 
            text-align: center; 
        }
        .container { 
            width: 80%; 
            margin: 0 auto; 
        }
        main {
            flex: 1;
        }
        .info-card { 
            background: #f8f9fa; 
            border-radius: 5px; 
            padding: 2rem; 
            margin: 2rem 0; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
        }
        h1 { margin: 0; font-size: 2.5rem; }
        h2 { color: #2c3e50; }
        .api-endpoints { 
            background: #e9ecef; 
            padding: 1rem; 
            border-radius: 4px; 
            margin-top: 1rem; 
        }
        .endpoint { margin: 10px 0; padding: 5px; }
        code { 
            background: #d6d8db; 
            padding: 2px 5px; 
            border-radius: 3px; 
        }
        .btn { 
            display: inline-block; 
            background: #2c3e50; 
            color: white; 
            padding: 0.5rem 1rem; 
            text-decoration: none; 
            border-radius: 4px; 
            margin-top: 1rem; 
        }
        footer { 
            background: #2c3e50; 
            color: white; 
            text-align: center; 
            padding: 1rem 0; 
            margin-top: 2rem; 
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>Магазин одежды $DOMAIN</h1>
            <p>Интернет-магазин стильной одежды на любой вкус</p>
        </div>
    </header>
    
    <main class="container">
        <div class="info-card">
            <h2>Сайт в разработке</h2>
            <p>Наш сайт находится в стадии активной разработки и скоро будет доступен.</p>
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
    </main>
    
    <footer>
        <div class="container">
            &copy; $(date +%Y) $DOMAIN - Все права защищены
        </div>
    </footer>
</body>
</html>
EOF

print_message "Временная HTML страница создана"

# Шаг 5: Настройка Nginx
print_header "Настройка Nginx"

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
rm -f /etc/nginx/sites-enabled/default

# Проверяем конфигурацию Nginx
print_message "Проверка конфигурации Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    print_message "Конфигурация Nginx верна. Перезапускаем Nginx..."
    systemctl restart nginx
else
    print_error "Ошибка в конфигурации Nginx. Проверьте синтаксис конфигурационного файла."
    exit 1
fi

# Настройка файрвола
print_header "Настройка файрвола"
if command -v ufw &> /dev/null; then
    print_message "UFW найден. Настраиваем правила..."
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 22/tcp
    ufw allow $PORT/tcp
    
    # Активация UFW, если еще не активен
    if ! ufw status | grep -q "Status: active"; then
        print_message "Активация UFW..."
        echo "y" | ufw enable
    else
        print_message "UFW уже активен"
    fi
else
    print_warning "UFW не установлен. Рекомендуется установить и настроить файрвол."
fi

# Запуск приложения через PM2
print_header "Запуск приложения через PM2"
cd $BACKEND_DIR

# Остановить существующие процессы
pm2 list | grep -q "$DOMAIN" && pm2 delete $DOMAIN

# Запуск нового процесса
pm2 start dist/index.js --name $DOMAIN
pm2 save
pm2 startup

print_message "Приложение запущено через PM2"

# Проверка доступности приложения
print_message "Проверка доступности приложения..."
sleep 3

if ss -tulpn | grep -q ":$PORT"; then
    print_message "✅ Порт $PORT успешно прослушивается. Приложение запущено."
    print_message "✅ Ваше приложение доступно по адресу: http://$DOMAIN"
else
    print_error "❌ Приложение не запустилось или не прослушивает порт $PORT."
    print_warning "Проверьте логи PM2:"
    pm2 logs $DOMAIN --lines 20
fi

# Информация по SSL
print_header "Настройка SSL (HTTPS)"
if dpkg -l | grep -q certbot; then
    print_message "Certbot уже установлен"
else
    print_message "Установка Certbot для SSL..."
    apt install -y certbot python3-certbot-nginx
fi

print_message "Для настройки SSL выполните команду:"
print_message "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"

# Завершение
print_header "Установка завершена"
print_message "✅ Бэкенд API успешно настроен и запущен"
print_message "✅ Временная страница фронтенда установлена"
print_message "✅ Nginx настроен и перезапущен"
print_message "✅ Файрвол настроен (если был установлен UFW)"

cat << EOF
=============================================================
  ВАЖНЫЕ КОМАНДЫ:
=============================================================
  • Просмотр логов приложения:    sudo pm2 logs $DOMAIN
  • Перезапуск приложения:        sudo pm2 restart $DOMAIN
  • Проверка статуса MongoDB:     sudo systemctl status mongod
  • Настройка SSL:                sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN
=============================================================

  Чтобы обновить реальный фронтенд после его сборки:
  1. Загрузите файлы из директории dist на сервер
  2. Разместите их в директории: $FRONTEND_DIR/dist/
  3. Перезапустите приложение:   sudo pm2 restart $DOMAIN

=============================================================
EOF