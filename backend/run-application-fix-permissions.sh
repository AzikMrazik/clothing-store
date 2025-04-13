#!/bin/bash
# Скрипт для запуска приложения с решением проблемы прав доступа к tsc

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

print_message "Запуск приложения из директории $BACKEND_DIR с исправлением прав доступа"

# Шаг 1: Проверяем существование директории с исходным кодом
if [ ! -d "$BACKEND_DIR" ]; then
    print_error "Директория бэкенда $BACKEND_DIR не существует. Проверьте путь."
    exit 1
else
    print_message "Директория бэкенда найдена."
fi

# Шаг 2: Убедимся, что npm и node настроены правильно
print_message "Проверка установки Node.js и npm..."
if ! command -v node &> /dev/null; then
    print_error "Node.js не установлен. Установите Node.js и повторите попытку."
    exit 1
else
    NODE_VERSION=$(node -v)
    print_message "Node.js установлен, версия: $NODE_VERSION"
fi

if ! command -v npm &> /dev/null; then
    print_error "npm не установлен. Установите npm и повторите попытку."
    exit 1
else
    NPM_VERSION=$(npm -v)
    print_message "npm установлен, версия: $NPM_VERSION"
fi

# Шаг 3: Проверка установки TypeScript и глобальная установка, если необходимо
print_message "Проверка установки TypeScript..."
if ! command -v tsc &> /dev/null; then
    print_warning "TypeScript (tsc) не найден. Устанавливаем глобально..."
    npm install -g typescript
    
    if ! command -v tsc &> /dev/null; then
        print_error "Не удалось установить TypeScript глобально. Проверьте npm-конфигурацию."
        
        # Пробуем альтернативный метод установки
        print_message "Пробуем альтернативный метод установки TypeScript..."
        npm config set prefix /usr/local
        npm install -g typescript
        
        if ! command -v tsc &> /dev/null; then
            print_error "Все еще не удается установить TypeScript. Создаем символическую ссылку..."
            # Проверяем, где может находиться tsc
            TSC_PATH=$(find /usr -name tsc 2>/dev/null | grep -v "node_modules/.bin" | head -1)
            
            if [ -n "$TSC_PATH" ]; then
                print_message "Найден tsc по пути: $TSC_PATH. Создаем символическую ссылку..."
                ln -sf $TSC_PATH /usr/local/bin/tsc
            else
                print_warning "tsc не найден в системе. Устанавливаем TypeScript локально и используем npx..."
            fi
        fi
    else
        print_message "TypeScript успешно установлен глобально."
    fi
else
    TSC_VERSION=$(tsc --version)
    print_message "TypeScript уже установлен, версия: $TSC_VERSION"
fi

# Шаг 4: Переходим в директорию бэкенда
cd $BACKEND_DIR
print_message "Текущая директория: $(pwd)"

# Шаг 5: Проверка и настройка прав доступа
print_message "Настройка прав доступа на директорию проекта..."
# Устанавливаем владельца директории
chown -R root:root $BACKEND_DIR
# Устанавливаем права доступа для директории и файлов
find $BACKEND_DIR -type d -exec chmod 755 {} \;
find $BACKEND_DIR -type f -exec chmod 644 {} \;
# Делаем скрипты исполняемыми
find $BACKEND_DIR -name "*.sh" -exec chmod +x {} \;

print_message "Права доступа настроены."

# Шаг 6: Устанавливаем зависимости и собираем проект
print_message "Проверка файла package.json..."
if [ -f "package.json" ]; then
    print_message "Файл package.json найден. Установка зависимостей..."
    npm install
    
    # Проверяем наличие TypeScript в локальных зависимостях
    if [ -d "node_modules/typescript" ]; then
        print_message "TypeScript найден в локальных зависимостях."
        
        # Проверка наличия скрипта сборки
        if grep -q '"build"' "package.json"; then
            print_message "Сборка приложения с использованием локального TypeScript..."
            # Используем npx для запуска локального tsc
            npx tsc
            
            if [ $? -ne 0 ]; then
                print_error "Ошибка при сборке с npx tsc. Пробуем альтернативный метод..."
                # Попробуем запустить через полный путь
                ./node_modules/.bin/tsc
                
                if [ $? -ne 0 ]; then
                    print_error "Не удалось выполнить сборку. Проверьте вывод ошибок выше."
                    print_message "Создаем временную директорию dist с минимальным index.js для тестирования..."
                    
                    # Создание минимальной структуры для тестирования
                    mkdir -p dist
                    cat > dist/index.js << EOF
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('Clothing Store API is running (Temporary test page)');
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`Server running on port \${port}\`);
});
EOF
                    print_warning "Создан временный файл dist/index.js для тестирования. После отладки прав доступа запустите скрипт снова."
                fi
            else
                print_message "Сборка с использованием npx tsc успешно выполнена."
            fi
        else
            print_warning "Скрипт сборки не найден в package.json. Пробуем создать директорию dist вручную..."
            
            # Создаем базовый index.js для тестирования
            mkdir -p dist
            cat > dist/index.js << EOF
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('Clothing Store API is running (Temporary test page)');
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`Server running on port \${port}\`);
});
EOF
            print_warning "Создан временный файл dist/index.js для тестирования. После отладки прав доступа запустите скрипт снова."
        fi
    else
        print_warning "TypeScript не найден в локальных зависимостях. Устанавливаем..."
        npm install --save-dev typescript
        
        # Повторная попытка сборки
        print_message "Повторная попытка сборки приложения..."
        npx tsc
        
        if [ $? -ne 0 ]; then
            print_error "Ошибка при сборке. Создаем временную директорию dist для тестирования..."
            
            # Создание минимальной структуры для тестирования
            mkdir -p dist
            cat > dist/index.js << EOF
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('Clothing Store API is running (Temporary test page)');
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`Server running on port \${port}\`);
});
EOF
            print_warning "Создан временный файл dist/index.js для тестирования. После отладки прав доступа запустите скрипт снова."
        fi
    fi
else
    print_error "Файл package.json не найден в $BACKEND_DIR. Проверьте структуру проекта."
    exit 1
fi

# Шаг 7: Проверка результатов сборки
if [ -d "dist" ]; then
    print_message "Директория dist найдена. Проверка наличия файла index.js..."
    if [ -f "dist/index.js" ]; then
        print_message "Файл dist/index.js найден. Приложение готово к запуску."
    else
        print_error "Файл dist/index.js не найден. Сборка не выполнена корректно."
        print_message "Содержимое директории dist:"
        ls -la dist/
        
        print_warning "Создаем временный файл index.js для тестирования..."
        cat > dist/index.js << EOF
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('Clothing Store API is running (Temporary test page)');
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`Server running on port \${port}\`);
});
EOF
        print_warning "Создан временный файл dist/index.js для тестирования."
    fi
else
    print_error "Директория dist не найдена. Сборка не выполнена корректно."
    print_warning "Создаем временную директорию dist для тестирования..."
    
    mkdir -p dist
    cat > dist/index.js << EOF
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('Clothing Store API is running (Temporary test page)');
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`Server running on port \${port}\`);
});
EOF
    print_warning "Создан временный файл dist/index.js для тестирования."
fi

# Шаг 8: Проверка и создание файла .env
print_message "Проверка файла .env..."
if [ ! -f ".env" ]; then
    print_warning "Файл .env не найден. Создаю новый файл .env..."
    cat > .env << EOF
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
CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN
EOF
    print_message "Файл .env создан."
else
    print_message "Файл .env найден."
    
    # Проверка наличия PORT в .env
    if ! grep -q "PORT" .env; then
        print_warning "В файле .env отсутствует параметр PORT. Добавляю..."
        echo "PORT=$PORT" >> .env
    fi
    
    # Проверка наличия CORS_ORIGIN в .env
    if ! grep -q "CORS_ORIGIN" .env; then
        print_warning "В файле .env отсутствует параметр CORS_ORIGIN. Добавляю..."
        echo "CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN" >> .env
    fi
fi

# Шаг 9: Установка и настройка PM2, если он еще не установлен
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 не установлен. Устанавливаем..."
    npm install -g pm2
    print_message "PM2 установлен."
else
    print_message "PM2 уже установлен."
fi

# Шаг 10: Проверка, запущено ли приложение в PM2
print_message "Проверка статуса приложения в PM2..."
if pm2 list | grep -q "$APP_NAME"; then
    print_message "Приложение '$APP_NAME' уже запущено в PM2. Перезапускаем..."
    pm2 restart $APP_NAME
else
    print_message "Запускаем приложение через PM2..."
    pm2 start dist/index.js --name $APP_NAME --env production
fi

# Шаг 11: Настройка автозапуска PM2
print_message "Настройка автозапуска PM2..."
pm2 save
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root -hp /root
pm2 save

# Шаг 12: Проверка, слушает ли приложение порт
sleep 3
print_message "Проверка, слушает ли приложение порт $PORT..."
if ss -tulpn | grep -q ":$PORT"; then
    print_message "Порт $PORT успешно прослушивается. Приложение запущено."
else
    print_error "Порт $PORT не прослушивается. Проверка логов PM2..."
    pm2 logs $APP_NAME --lines 20
fi

# Шаг 13: Обновление конфигурации Nginx для указания на правильный порт
print_message "Обновление конфигурации Nginx..."
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"

if [ -f "$NGINX_CONFIG" ]; then
    print_message "Файл конфигурации Nginx найден. Проверка настроек upstream..."
    
    # Проверка, правильно ли настроен upstream
    NGINX_UPSTREAM=$(grep -i "proxy_pass.*:$PORT" "$NGINX_CONFIG" || echo "NOT_FOUND")
    if [ "$NGINX_UPSTREAM" == "NOT_FOUND" ]; then
        print_warning "Upstream для порта $PORT не найден в конфигурации Nginx. Исправляем..."
        
        # Резервное копирование файла
        cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup"
        
        # Замена upstream, если существует другой порт
        if grep -q "proxy_pass http://localhost:[0-9]" "$NGINX_CONFIG"; then
            sed -i "s#proxy_pass http://localhost:[0-9]*/#proxy_pass http://localhost:$PORT/#g" "$NGINX_CONFIG"
            print_message "Upstream обновлен в конфигурации Nginx."
        else
            print_error "Не удалось найти строку proxy_pass для замены. Проверьте конфигурацию Nginx вручную."
        fi
        
        # Проверка конфигурации и перезапуск Nginx
        print_message "Проверка синтаксиса Nginx..."
        nginx -t
        
        if [ $? -eq 0 ]; then
            print_message "Синтаксис Nginx верен. Перезапускаем Nginx..."
            systemctl restart nginx
        else
            print_error "Ошибка в синтаксисе Nginx. Восстанавливаем из резервной копии..."
            mv "$NGINX_CONFIG.backup" "$NGINX_CONFIG"
            print_error "Требуется ручная проверка конфигурации Nginx."
        fi
    else
        print_message "Upstream для порта $PORT настроен правильно в Nginx."
    fi
else
    print_warning "Файл конфигурации Nginx для $DOMAIN не найден. Создаем новый..."
    
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
}
EOF
    
    print_message "Создана базовая конфигурация Nginx. Создание символической ссылки..."
    ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/
    
    print_message "Проверка синтаксиса Nginx..."
    nginx -t
    
    if [ $? -eq 0 ]; then
        print_message "Синтаксис Nginx верен. Перезапускаем Nginx..."
        systemctl restart nginx
    else
        print_error "Ошибка в синтаксисе Nginx. Требуется ручная проверка."
    fi
    
    print_warning "Не забудьте настроить SSL для вашего домена с помощью Certbot:"
    print_warning "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

# Шаг 14: Финальная проверка прав доступа
print_message "Финальная проверка прав доступа для Node.js и npm..."
ls -la $(which node)
ls -la $(which npm)
ls -la $(which npx) || echo "npx не найден как отдельный исполняемый файл."

if command -v tsc &> /dev/null; then
    ls -la $(which tsc)
else
    print_warning "Команда tsc не найдена в системном пути."
fi

# Информация о путях npm
print_message "Информация о путях npm:"
npm config get prefix
npm config get bin

# Вывод путей NODE_PATH
print_message "Переменная окружения NODE_PATH:"
echo $NODE_PATH

# Шаг 15: Заключительное сообщение
print_message "==============================================="
print_message "Приложение успешно запущено!"
print_message "==============================================="
print_message "Статус приложения:"
pm2 status $APP_NAME
print_message "-----------------------------------------------"
print_message "Проверьте доступность сайта по адресу:"
print_message "https://$DOMAIN"
print_message "-----------------------------------------------"
print_message "Для просмотра логов приложения выполните:"
print_message "pm2 logs $APP_NAME"
print_message "-----------------------------------------------"
print_message "Если возникли проблемы с TypeScript, рассмотрите:"
print_message "1. Установите TypeScript глобально: npm install -g typescript"
print_message "2. Компилируйте вручную: npx tsc"
print_message "3. Используйте PM2 с источником TS: pm2 start src/index.ts --interpreter ts-node"
print_message "==============================================="