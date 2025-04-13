#!/bin/bash
# Скрипт для диагностики и исправления ошибок соединения с бэкенд-приложением
# Ошибка: connect() failed (111: Connection refused) while connecting to upstream

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

# Определение директорий и переменных
BACKEND_DIR="/var/www/clothing-store/backend"
PORT=3001
APP_NAME="clothing-store"
DOMAIN="prostor-shop.shop"

print_message "Начинаю диагностику проблемы соединения для приложения на порту $PORT..."

# Шаг 1: Проверка, запущено ли приложение в PM2
print_message "Проверка статуса приложения в PM2..."
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 не установлен. Устанавливаем..."
    npm install -g pm2
fi

PM2_STATUS=$(pm2 list | grep -i "$APP_NAME" || echo "NOT_FOUND")
if [ "$PM2_STATUS" == "NOT_FOUND" ]; then
    print_warning "Приложение '$APP_NAME' не найдено в PM2."
    
    # Проверка, существует ли каталог бэкенда и файл index.js
    if [ -d "$BACKEND_DIR" ]; then
        print_message "Каталог бэкенда найден. Проверка файла index.js..."
        
        # Проверка dist/index.js
        if [ -f "$BACKEND_DIR/dist/index.js" ]; then
            print_message "Найден файл dist/index.js. Запускаем приложение с помощью PM2..."
            cd $BACKEND_DIR
            pm2 start dist/index.js --name "$APP_NAME" --env production
            sleep 3
            pm2 save
        else
            # Проверка исходного index.js, если dist не существует
            if [ -f "$BACKEND_DIR/src/index.js" ] || [ -f "$BACKEND_DIR/src/index.ts" ]; then
                print_message "Найден исходный файл index. Собираем и запускаем приложение..."
                cd $BACKEND_DIR
                npm install
                npm run build
                
                if [ -f "$BACKEND_DIR/dist/index.js" ]; then
                    print_message "Сборка успешна. Запускаем приложение с помощью PM2..."
                    pm2 start dist/index.js --name "$APP_NAME" --env production
                    sleep 3
                    pm2 save
                else
                    print_error "Сборка не создала dist/index.js. Проверьте процесс сборки."
                fi
            else
                print_error "Файлы index.js/index.ts не найдены в каталоге src. Проверьте структуру проекта."
            fi
        fi
    else
        print_error "Каталог бэкенда '$BACKEND_DIR' не существует. Проверьте путь."
    fi
else
    print_message "Приложение найдено в PM2. Проверка статуса..."
    PM2_APP_STATUS=$(pm2 show "$APP_NAME" | grep -i "status" | awk '{print $4}')
    
    if [ "$PM2_APP_STATUS" != "online" ]; then
        print_warning "Приложение в PM2 не в статусе 'online'. Перезапускаем..."
        pm2 restart "$APP_NAME"
        sleep 3
    else
        print_message "Приложение работает в PM2. Проверка доступности порта..."
    fi
fi

# Шаг 2: Проверка, слушает ли порт
print_message "Проверка, слушает ли порт $PORT..."
PORT_LISTENING=$(ss -tulpn | grep ":$PORT" || echo "NOT_LISTENING")
if [ "$PORT_LISTENING" == "NOT_LISTENING" ]; then
    print_warning "Порт $PORT не прослушивается. Проверка причины..."
    
    # Проверка файла .env на правильный порт
    if [ -f "$BACKEND_DIR/.env" ]; then
        print_message "Проверка файла .env..."
        ENV_PORT=$(grep -i "PORT" "$BACKEND_DIR/.env" | cut -d= -f2 || echo "NOT_FOUND")
        
        if [ "$ENV_PORT" == "NOT_FOUND" ] || [ "$ENV_PORT" != "$PORT" ]; then
            print_warning "Порт в .env отсутствует или отличается от $PORT. Исправляем..."
            
            if grep -q "PORT" "$BACKEND_DIR/.env"; then
                # Заменяем существующий порт
                sed -i "s/PORT=.*/PORT=$PORT/" "$BACKEND_DIR/.env"
            else
                # Добавляем порт
                echo "PORT=$PORT" >> "$BACKEND_DIR/.env"
            fi
            
            print_message "Порт обновлен в .env. Перезапускаем приложение..."
            pm2 restart "$APP_NAME"
            sleep 3
        fi
    else
        print_warning "Файл .env не найден. Создаем базовый файл .env..."
        cat > "$BACKEND_DIR/.env" << EOF
NODE_ENV=production
PORT=$PORT
MONGODB_URI=mongodb://localhost:27017/clothing-store
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN
EOF
        print_message "Файл .env создан. Перезапускаем приложение..."
        pm2 restart "$APP_NAME" || pm2 start "$BACKEND_DIR/dist/index.js" --name "$APP_NAME"
        sleep 3
    fi
    
    # Повторная проверка порта
    PORT_LISTENING_AGAIN=$(ss -tulpn | grep ":$PORT" || echo "NOT_LISTENING")
    if [ "$PORT_LISTENING_AGAIN" == "NOT_LISTENING" ]; then
        print_error "Порт $PORT все еще не прослушивается. Проверьте логи приложения."
        print_message "Просмотр логов PM2:"
        pm2 logs "$APP_NAME" --lines 20
    else
        print_message "Порт $PORT теперь прослушивается!"
    fi
else
    print_message "Порт $PORT прослушивается. Проверка, какой процесс его использует..."
    PID=$(echo "$PORT_LISTENING" | awk '{print $6}' | cut -d= -f2 | cut -d, -f1)
    PROCESS=$(ps -p "$PID" -o comm= || echo "Unknown")
    print_message "Процесс '$PROCESS' (PID: $PID) использует порт $PORT."
fi

# Шаг 3: Проверка настроек Nginx
print_message "Проверка конфигурации Nginx для $DOMAIN..."
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

# Шаг 4: Проверка файрвола
print_message "Проверка настроек файрвола для портов 80, 443 и $PORT..."
if command -v ufw &> /dev/null; then
    print_message "UFW установлен. Проверка правил..."
    UFW_STATUS=$(ufw status | grep -E "(80|443|$PORT)/tcp" || echo "NOT_FOUND")
    
    if [ "$UFW_STATUS" == "NOT_FOUND" ]; then
        print_warning "Правила UFW для необходимых портов не найдены. Добавляем..."
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow $PORT/tcp
        print_message "Правила UFW добавлены."
    else
        print_message "Порты 80, 443 и $PORT разрешены в UFW."
    fi
else
    print_message "UFW не установлен. Проверка iptables..."
    IPTABLES_RULES=$(iptables -L -n | grep -E "(80|443|$PORT)")
    
    if [ -z "$IPTABLES_RULES" ]; then
        print_warning "Правила iptables для портов не найдены. Рекомендуется установить и настроить UFW:"
        print_warning "sudo apt install ufw && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow $PORT/tcp && sudo ufw enable"
    else
        print_message "Правила iptables для необходимых портов существуют."
    fi
fi

# Шаг 5: Заключительная проверка
print_message "Выполнение заключительной проверки..."

# Проверка статуса MongoDB
print_message "Проверка статуса MongoDB..."
if systemctl is-active --quiet mongod; then
    print_message "MongoDB запущен и работает."
elif systemctl is-active --quiet snap.mongodb.mongod; then
    print_message "MongoDB (snap-версия) запущен и работает."
else
    print_warning "MongoDB не запущен. Пытаемся запустить..."
    systemctl start mongod || systemctl start snap.mongodb.mongod || print_error "Не удалось запустить MongoDB. Требуется проверка вручную."
fi

# Проверка приложения в PM2
print_message "Финальная проверка приложения в PM2..."
PM2_FINAL=$(pm2 list | grep -i "$APP_NAME" || echo "NOT_FOUND")
if [ "$PM2_FINAL" == "NOT_FOUND" ]; then
    print_error "Приложение не запущено в PM2 после всех попыток. Требуется ручная проверка."
else
    print_message "Приложение запущено в PM2."
fi

# Проверка порта снова
print_message "Финальная проверка порта $PORT..."
PORT_FINAL=$(ss -tulpn | grep ":$PORT" || echo "NOT_LISTENING")
if [ "$PORT_FINAL" == "NOT_LISTENING" ]; then
    print_error "Порт $PORT все еще не прослушивается после всех исправлений."
    print_error "Проверьте логи приложения: pm2 logs $APP_NAME"
else
    print_message "Порт $PORT прослушивается. Проверка завершена успешно!"
fi

print_message "==============================================="
print_message "Диагностика и исправление проблем завершены!"
print_message "Если сайт все еще недоступен, пожалуйста, выполните:"
print_message "1. Проверьте логи PM2: pm2 logs $APP_NAME"
print_message "2. Проверьте логи Nginx: sudo tail -f /var/log/nginx/error.log"
print_message "3. Убедитесь, что DNS для $DOMAIN указывает на правильный IP-адрес"
print_message "4. Проверьте работу MongoDB: systemctl status mongod"
print_message "5. Проверьте подключение к MongoDB в логах приложения"
print_message "==============================================="