#!/bin/bash
# Скрипт для развертывания приложения на VPS с Ubuntu

# Проверка наличия необходимых программ
echo "Проверка зависимостей..."
if ! command -v node &> /dev/null; then
    echo "Node.js не установлен. Устанавливаем..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js уже установлен: $(node -v)"
fi

# Улучшенная установка MongoDB с альтернативными методами
if ! command -v mongod &> /dev/null; then
    echo "MongoDB не установлен. Устанавливаем..."
    
    # Метод 1: Основной метод установки через официальный репозиторий
    echo "Метод 1: Установка MongoDB из официального репозитория"
    sudo apt install -y gnupg curl
    
    # Очистка старых ключей, если они есть
    sudo rm -f /usr/share/keyrings/mongodb-server-*
    
    # Импорт публичного ключа MongoDB
    curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
        sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
    
    # Проверка успешности импорта ключа
    if [ ! -f "/usr/share/keyrings/mongodb-server-6.0.gpg" ]; then
        echo "Ошибка импорта ключа MongoDB. Пробуем альтернативный метод..."
        
        # Метод 2: Использование apt-key (устаревший, но иногда работает на старых системах)
        curl -fsSL https://pgp.mongodb.com/server-6.0.asc | sudo apt-key add -
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    else
        # Продолжаем с первым методом
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    fi
    
    # Обновление пакетов
    sudo apt update
    
    # Пробуем установить MongoDB
    if ! sudo apt install -y mongodb-org; then
        echo "Ошибка установки MongoDB через репозиторий. Пробуем метод 3..."
        
        # Метод 3: Установка через snap (доступно во всех современных Ubuntu)
        echo "Метод 3: Установка MongoDB через snap"
        sudo snap install mongodb
        
        if ! command -v mongod &> /dev/null; then
            echo "Все методы установки MongoDB не удались."
            echo "Пожалуйста, установите MongoDB вручную с сайта: https://www.mongodb.com/docs/manual/installation/"
            echo "После установки MongoDB, запустите этот скрипт снова."
            exit 1
        fi
    fi
    
    # Запуск и активация MongoDB (для apt установки)
    if systemctl list-unit-files | grep -q mongod; then
        sudo systemctl start mongod
        sudo systemctl enable mongod
        echo "MongoDB запущен и добавлен в автозагрузку"
    elif systemctl list-unit-files | grep -q mongodb; then
        # Для snap-версии или некоторых других вариантов
        sudo systemctl start mongodb
        sudo systemctl enable mongodb
        echo "MongoDB (snap) запущен и добавлен в автозагрузку"
    fi
    
    # Проверка работы MongoDB
    sleep 5 # Даем MongoDB время запуститься
    if ! mongo --eval "db.version()" || ! mongosh --eval "db.version()"; then
        echo "ВНИМАНИЕ: Не удалось подключиться к MongoDB для проверки. Возможно, требуется дополнительная настройка."
        echo "Проверьте логи: sudo systemctl status mongod"
    else
        echo "MongoDB успешно установлен и работает."
    fi
else
    echo "MongoDB уже установлен"
fi

if ! command -v pm2 &> /dev/null; then
    echo "PM2 не установлен. Устанавливаем..."
    sudo npm install -g pm2
else
    echo "PM2 уже установлен"
fi

if ! command -v nginx &> /dev/null; then
    echo "Nginx не установлен. Устанавливаем..."
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
else
    echo "Nginx уже установлен"
fi

# Настройка брандмауэра
echo "Настройка брандмауэра..."
sudo apt install -y ufw
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
echo "y" | sudo ufw enable

# Создание директории для приложения
APP_DIR="/var/www/clothing-store"
echo "Создание директории для приложения: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown -R $(whoami):$(whoami) $APP_DIR

# Копирование файлов приложения
echo "Копирование файлов приложения..."
rsync -av --exclude 'node_modules' --exclude '.git' . $APP_DIR/

# Настройка переменных окружения
echo "Настройка переменных окружения..."
if [ ! -f "$APP_DIR/.env" ]; then
    echo "Создание файла .env..."
    cat > $APP_DIR/.env << EOF
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
CORS_ORIGIN=https://yourdomain.com
EOF
    echo "Файл .env создан"
else
    echo "Файл .env уже существует"
fi

# Установка зависимостей и сборка приложения
echo "Установка зависимостей и сборка приложения..."
cd $APP_DIR
npm install --production
npm run build

# Настройка Nginx
echo "Настройка Nginx..."
NGINX_CONF="/etc/nginx/sites-available/clothing-store"

if [ ! -f "$NGINX_CONF" ]; then
    echo "Создание конфигурации Nginx..."
    read -p "Введите доменное имя (например, example.com): " DOMAIN_NAME
    
    sudo tee $NGINX_CONF > /dev/null << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};

    location / {
        proxy_pass http://localhost:3001;
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

    sudo ln -s $NGINX_CONF /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl restart nginx
    
    # Установка SSL с Let's Encrypt
    read -p "Установить SSL-сертификат с Let's Encrypt? (y/n): " INSTALL_SSL
    if [[ "$INSTALL_SSL" == "y" || "$INSTALL_SSL" == "Y" ]]; then
        echo "Установка Certbot..."
        sudo apt install -y certbot python3-certbot-nginx
        sudo certbot --nginx -d ${DOMAIN_NAME} -d www.${DOMAIN_NAME}
    fi
else
    echo "Конфигурация Nginx уже существует"
fi

# Настройка и запуск PM2
echo "Настройка и запуск PM2..."
pm2 start dist/index.js --name "clothing-store" --env production
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
pm2 save

echo "==========================================================="
echo "Развертывание приложения завершено!"
echo "Приложение запущено через PM2 и доступно через Nginx"
echo "Проверьте логи с помощью команды: pm2 logs clothing-store"
echo "Мониторинг приложения: pm2 monit"
echo "==========================================================="