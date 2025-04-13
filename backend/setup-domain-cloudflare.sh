#!/bin/bash
# Скрипт для настройки домена с Cloudflare и SSL на VPS

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

# Запрос информации о домене
read -p "Введите ваш домен (без www, например example.com): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
    print_error "Имя домена не указано. Выход."
    exit 1
fi

read -p "Введите ваш IP-адрес VPS: " SERVER_IP
if [ -z "$SERVER_IP" ]; then
    print_error "IP-адрес не указан. Выход."
    exit 1
fi

read -p "Укажите порт бэкенд-приложения (по умолчанию 3001): " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-3001}

read -p "Укажите путь к директории фронтенд-приложения (например, /var/www/clothing-store/frontend/dist): " FRONTEND_PATH
FRONTEND_PATH=${FRONTEND_PATH:-"/var/www/clothing-store/frontend/dist"}

read -p "Установить SSL-сертификат через Certbot? (y/n): " INSTALL_SSL
INSTALL_SSL=${INSTALL_SSL:-"y"}

# Настройка Nginx для работы с доменом
print_message "Настройка Nginx для домена $DOMAIN_NAME..."

# Создание конфигурационного файла Nginx
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN_NAME"

cat > $NGINX_CONF << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Для статических файлов фронтенда
    location /static/ {
        alias $FRONTEND_PATH/;
        expires 30d;
    }
    
    # Для обработки маршрутов React/Vue при обновлении страницы
    location ~ ^/(?!api|static).* {
        try_files \$uri $FRONTEND_PATH/index.html;
    }
}
EOF

# Активация конфигурации
if [ -f "/etc/nginx/sites-enabled/$DOMAIN_NAME" ]; then
    rm "/etc/nginx/sites-enabled/$DOMAIN_NAME"
fi

ln -s $NGINX_CONF "/etc/nginx/sites-enabled/"

# Проверка конфигурации Nginx
print_message "Проверка конфигурации Nginx..."
nginx -t

if [ $? -ne 0 ]; then
    print_error "Ошибка в конфигурации Nginx. Проверьте файл $NGINX_CONF"
    exit 1
fi

# Перезапуск Nginx
print_message "Перезапуск Nginx..."
systemctl restart nginx

# Установка Certbot и получение SSL-сертификата
if [[ "$INSTALL_SSL" == "y" || "$INSTALL_SSL" == "Y" ]]; then
    print_message "Установка Certbot и получение SSL-сертификата..."
    
    # Проверка наличия Certbot
    if ! command -v certbot &> /dev/null; then
        print_message "Установка Certbot..."
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Получение сертификата
    print_message "Запрос SSL-сертификата для $DOMAIN_NAME и www.$DOMAIN_NAME..."
    certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME
    
    if [ $? -ne 0 ]; then
        print_warning "Не удалось получить SSL-сертификат автоматически. Возможно, ваш домен еще не настроен в DNS или Cloudflare."
        print_warning "Вы можете повторить этот шаг позже, выполнив команду:"
        print_warning "sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME"
    else
        print_message "SSL-сертификат успешно получен и настроен!"
    fi
else
    print_message "Пропуск установки SSL-сертификата..."
fi

# Обновление настроек CORS в .env файле
ENV_FILE="/var/www/clothing-store/backend/.env"

if [ -f "$ENV_FILE" ]; then
    print_message "Обновление настроек CORS в файле .env..."
    
    # Проверка наличия настройки CORS_ORIGIN
    if grep -q "CORS_ORIGIN" "$ENV_FILE"; then
        # Обновление значения
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN_NAME,https://www.$DOMAIN_NAME|g" "$ENV_FILE"
    else
        # Добавление новой настройки
        echo "CORS_ORIGIN=https://$DOMAIN_NAME,https://www.$DOMAIN_NAME" >> "$ENV_FILE"
    fi
    
    print_message "Настройки CORS обновлены."
else
    print_warning "Файл .env не найден в /var/www/clothing-store/backend/. Пропуск обновления CORS."
fi

# Перезапуск приложения через PM2, если оно используется
if command -v pm2 &> /dev/null; then
    print_message "Перезапуск приложения через PM2..."
    if pm2 list | grep -q "clothing-store"; then
        pm2 restart clothing-store
        print_message "Приложение перезапущено."
    else
        print_warning "Приложение 'clothing-store' не найдено в PM2. Пропуск перезапуска."
    fi
fi

print_message "==============================================="
print_message "Настройка домена $DOMAIN_NAME завершена!"
print_message "==============================================="
print_message "Следующие шаги:"
print_message "1. Настройте DNS-записи в Cloudflare:"
print_message "   - A-запись: $DOMAIN_NAME -> $SERVER_IP"
print_message "   - CNAME-запись: www -> $DOMAIN_NAME"
print_message "2. В Cloudflare включите режим SSL/TLS 'Full (strict)'"
print_message "3. Настройте оптимизацию производительности и безопасность в Cloudflare"
print_message "4. Проверьте доступность сайта по HTTPS: https://$DOMAIN_NAME"
print_message "==============================================="