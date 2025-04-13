#!/bin/bash
# Скрипт для завершения настройки приложения с доменом prostor-shop.shop

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

# Определение рабочих директорий
BACKEND_DIR="/var/www/clothing-store/backend"
FRONTEND_DIR="/var/www/clothing-store/frontend"
DOMAIN_NAME="prostor-shop.shop"

print_message "Начинаю настройку приложения для домена $DOMAIN_NAME..."

# 1. Создание директорий, если они не существуют
print_message "Проверка и создание необходимых директорий..."
mkdir -p $BACKEND_DIR
mkdir -p $FRONTEND_DIR
mkdir -p $BACKEND_DIR/logs

# 2. Проверка и установка PM2, если не установлен
if ! command -v pm2 &> /dev/null; then
    print_message "Установка PM2..."
    npm install -g pm2
else
    print_message "PM2 уже установлен."
fi

# 3. Создание файла .env в бэкенде
print_message "Создание файла .env для бэкенда..."
cat > $BACKEND_DIR/.env << EOF
NODE_ENV=production
PORT=3001
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
CORS_ORIGIN=https://$DOMAIN_NAME,https://www.$DOMAIN_NAME
EOF

# 4. Проверка структуры директории бэкенда
if [ ! -f "$BACKEND_DIR/package.json" ]; then
    print_warning "package.json не найден в $BACKEND_DIR. Возможно, нужно скопировать файлы проекта."
    
    # Проверяем, установлен ли git
    if command -v git &> /dev/null; then
        read -p "Хотите клонировать репозиторий с GitHub? (y/n): " CLONE_REPO
        if [[ "$CLONE_REPO" == "y" || "$CLONE_REPO" == "Y" ]]; then
            read -p "Введите URL репозитория: " REPO_URL
            git clone $REPO_URL $BACKEND_DIR
            print_message "Репозиторий клонирован в $BACKEND_DIR"
        fi
    else
        print_warning "Git не установлен. Скопируйте файлы проекта вручную в $BACKEND_DIR"
    fi
else
    print_message "package.json найден в $BACKEND_DIR."
fi

# 5. Установка зависимостей бэкенда
if [ -f "$BACKEND_DIR/package.json" ]; then
    print_message "Установка зависимостей бэкенда..."
    cd $BACKEND_DIR
    npm install --production
    
    # Проверка наличия скрипта сборки в package.json
    if grep -q '"build"' "$BACKEND_DIR/package.json"; then
        print_message "Сборка бэкенда..."
        npm run build
    else
        print_warning "Скрипт сборки не найден в package.json. Пропуск сборки."
    fi
fi

# 6. Настройка фронтенда
if [ -f "$FRONTEND_DIR/package.json" ]; then
    print_message "Настройка фронтенда..."
    cat > $FRONTEND_DIR/.env << EOF
VITE_API_URL=https://$DOMAIN_NAME/api
EOF
    
    # Установка зависимостей и сборка фронтенда
    cd $FRONTEND_DIR
    print_message "Установка зависимостей и сборка фронтенда..."
    npm install
    npm run build
else
    print_warning "package.json не найден в $FRONTEND_DIR. Пропуск настройки фронтенда."
fi

# 7. Запуск приложения через PM2
print_message "Запуск приложения через PM2..."
cd $BACKEND_DIR
if [ -f "$BACKEND_DIR/dist/index.js" ]; then
    pm2 start dist/index.js --name "clothing-store" --env production
    print_message "PM2 настройка автозапуска..."
    pm2 startup
    # Сохраняем текущую конфигурацию PM2
    pm2 save
else
    print_warning "Файл dist/index.js не найден. Проверьте сборку приложения."
fi

# 8. Настройка logrotate для PM2
print_message "Настройка logrotate для логов PM2..."
cat > /etc/logrotate.d/pm2-clothing-store << EOF
/home/$(whoami)/.pm2/logs/*.log {
  daily
  rotate 7
  compress
  delaycompress
  missingok
  notifempty
  create 0640 $(whoami) $(whoami)
  postrotate
    /usr/lib/node_modules/pm2/bin/pm2 flush
  endscript
}
EOF

# 9. Проверка DNS и запрос SSL-сертификата, если возможно
print_message "Проверка DNS для $DOMAIN_NAME..."
if host $DOMAIN_NAME &> /dev/null; then
    print_message "DNS запись для $DOMAIN_NAME найдена. Пробуем запросить SSL-сертификат..."
    
    # Установка certbot, если не установлен
    if ! command -v certbot &> /dev/null; then
        print_message "Установка Certbot..."
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Запрос сертификата
    certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME
else
    print_warning "DNS запись для $DOMAIN_NAME не найдена или не обновлена."
    print_warning "После обновления DNS выполните команду:"
    print_warning "sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME"
fi

# 10. Перезапуск Nginx
print_message "Перезапуск Nginx..."
systemctl restart nginx

# 11. Проверка статуса всех сервисов
print_message "Проверка статуса сервисов..."
print_message "Статус Nginx:"
systemctl status nginx --no-pager

print_message "Статус PM2:"
pm2 list

print_message "Проверка открытых портов:"
ss -tulpn | grep -E ':(80|443|3001)'

print_message "==============================================="
print_message "Настройка приложения для домена $DOMAIN_NAME завершена!"
print_message "==============================================="
print_message "Следующие шаги:"
print_message "1. Убедитесь, что DNS-записи в Cloudflare настроены правильно:"
print_message "   - A-запись: $DOMAIN_NAME -> IP вашего сервера"
print_message "   - CNAME-запись: www -> $DOMAIN_NAME"
print_message "2. Когда DNS-записи обновятся, получите SSL-сертификат с помощью команды:"
print_message "   sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME"
print_message "3. Включите в Cloudflare режим SSL/TLS 'Full (strict)'"
print_message "4. Проверьте доступность сайта: https://$DOMAIN_NAME"
print_message "5. Проверьте логи при возникновении проблем:"
print_message "   sudo tail -f /var/log/nginx/error.log"
print_message "   pm2 logs"
print_message "==============================================="