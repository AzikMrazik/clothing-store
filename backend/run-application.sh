#!/bin/bash
# Скрипт для запуска приложения из корректной директории /root/clothing-store

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

print_message "Запуск приложения из директории $BACKEND_DIR"

# Шаг 1: Проверяем существование директории с исходным кодом
if [ ! -d "$BACKEND_DIR" ]; then
    print_error "Директория бэкенда $BACKEND_DIR не существует. Проверьте путь."
    exit 1
else
    print_message "Директория бэкенда найдена."
fi

# Шаг 2: Переходим в директорию бэкенда
cd $BACKEND_DIR
print_message "Текущая директория: $(pwd)"

# Шаг 3: Устанавливаем зависимости и собираем проект
print_message "Проверка файла package.json..."
if [ -f "package.json" ]; then
    print_message "Файл package.json найден. Установка зависимостей..."
    npm install

    print_message "Проверка наличия скрипта сборки..."
    if grep -q '"build"' "package.json"; then
        print_message "Сборка приложения..."
        npm run build
    else
        print_warning "Скрипт сборки не найден в package.json. Пропуск сборки."
    fi
else
    print_error "Файл package.json не найден в $BACKEND_DIR. Проверьте структуру проекта."
    exit 1
fi

# Шаг 4: Проверка результатов сборки
if [ -d "dist" ]; then
    print_message "Директория dist найдена. Проверка наличия файла index.js..."
    if [ -f "dist/index.js" ]; then
        print_message "Файл dist/index.js найден. Приложение готово к запуску."
    else
        print_error "Файл dist/index.js не найден. Сборка не выполнена корректно."
        print_message "Содержимое директории dist:"
        ls -la dist/
        exit 1
    fi
else
    print_error "Директория dist не найдена. Сборка не выполнена корректно."
    exit 1
fi

# Шаг 5: Проверка и создание файла .env
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

# Шаг 6: Установка и настройка PM2, если он еще не установлен
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 не установлен. Устанавливаем..."
    npm install -g pm2
    print_message "PM2 установлен."
else
    print_message "PM2 уже установлен."
fi

# Шаг 7: Проверка, запущено ли приложение в PM2
print_message "Проверка статуса приложения в PM2..."
if pm2 list | grep -q "$APP_NAME"; then
    print_message "Приложение '$APP_NAME' уже запущено в PM2. Перезапускаем..."
    pm2 restart $APP_NAME
else
    print_message "Запускаем приложение через PM2..."
    pm2 start dist/index.js --name $APP_NAME --env production
fi

# Шаг 8: Настройка автозапуска PM2
print_message "Настройка автозапуска PM2..."
pm2 save
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root -hp /root
pm2 save

# Шаг 9: Проверка, слушает ли приложение порт
sleep 3
print_message "Проверка, слушает ли приложение порт $PORT..."
if ss -tulpn | grep -q ":$PORT"; then
    print_message "Порт $PORT успешно прослушивается. Приложение запущено."
else
    print_error "Порт $PORT не прослушивается. Проверка логов PM2..."
    pm2 logs $APP_NAME --lines 20
fi

# Шаг 10: Обновление конфигурации Nginx для указания на правильный порт
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

# Шаг 11: Заключительное сообщение
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
print_message "==============================================="