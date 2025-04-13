# Инструкция по развертыванию приложения на VPS (Ubuntu)

## Предварительные шаги

1. Арендуйте VPS с Ubuntu (рекомендуется Ubuntu 22.04 LTS)
2. Подключитесь по SSH к вашему серверу
3. Обновите систему:

```bash
sudo apt update
sudo apt upgrade -y
```

## Установка необходимого ПО

### Установка Node.js и npm

```bash
# Добавление репозитория NodeSource для установки актуальной версии Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Установка Node.js и npm
sudo apt install -y nodejs

# Проверка установки
node -v
npm -v
```

### Установка MongoDB

```bash
# Импорт публичного ключа MongoDB
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor

# Создание файла источника для MongoDB
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Обновление пакетов
sudo apt update

# Установка MongoDB
sudo apt install -y mongodb-org

# Запуск и активация MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Проверка статуса MongoDB
sudo systemctl status mongod
```

### Установка PM2 для управления процессами Node.js

```bash
# Установка PM2 глобально
sudo npm install -g pm2
```

### Настройка Nginx для проксирования запросов

```bash
# Установка Nginx
sudo apt install -y nginx

# Включение и запуск службы Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Настройка брандмауэра

```bash
# Установка ufw
sudo apt install -y ufw

# Настройка правил брандмауэра
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw allow 27017/tcp  # Порт MongoDB (можно ограничить доступ только с вашего IP)

# Активация брандмауэра
sudo ufw enable
```

## Клонирование и настройка приложения

### Клонирование репозитория (если используется Git)

```bash
# Установка Git
sudo apt install -y git

# Клонирование репозитория (замените URL на ваш)
git clone https://github.com/yourusername/clothing-store.git
cd clothing-store/backend
```

### Настройка переменных окружения

```bash
# Создание файла .env
cat > .env << EOF
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/clothing-store
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your_secure_refresh_token_key
JWT_REFRESH_EXPIRES_IN=7d
PASSWORD_SALT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOGIN_TIMEOUT=15
SESSION_SECRET=your_secure_session_secret
COOKIE_SECURE=true
COOKIE_MAX_AGE=864000000
CSRF_ENABLED=true
CORS_ORIGIN=https://yourdomain.com
EOF
```

### Установка зависимостей и сборка приложения

```bash
# Установка зависимостей
npm install --production

# Сборка приложения (TypeScript -> JavaScript)
npm run build
```

### Настройка Nginx в качестве обратного прокси

```bash
# Создание конфигурации для приложения
sudo nano /etc/nginx/sites-available/clothing-store

# Пример конфигурации:
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Включение сайта
sudo ln -s /etc/nginx/sites-available/clothing-store /etc/nginx/sites-enabled/

# Проверка конфигурации Nginx
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx
```

### Настройка SSL с Let's Encrypt (рекомендуется)

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение SSL-сертификата
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot автоматически изменит конфигурацию Nginx
# и настроит перенаправление с HTTP на HTTPS
```

## Запуск приложения с PM2

```bash
# Запуск приложения
pm2 start dist/index.js --name "clothing-store" --env production

# Настройка автозапуска PM2 при перезагрузке сервера
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
pm2 save

# Просмотр логов
pm2 logs clothing-store

# Мониторинг
pm2 monit
```

## Обновление приложения

```bash
# Перейдите в директорию приложения
cd /path/to/clothing-store/backend

# Если используете Git, получите последнюю версию
git pull

# Установите зависимости и пересоберите приложение
npm install --production
npm run build

# Перезапустите приложение
pm2 restart clothing-store
```

## Настройка автоматических резервных копий MongoDB

Создайте скрипт для резервного копирования:

```bash
cat > /home/$(whoami)/backup-mongodb.sh << EOF
#!/bin/bash
DATE=\$(date +"%Y-%m-%d")
BACKUP_DIR="/home/$(whoami)/backups/mongodb"

# Создать директорию для резервных копий, если она не существует
mkdir -p \$BACKUP_DIR

# Создать резервную копию
mongodump --out=\$BACKUP_DIR/\$DATE

# Удалить резервные копии старше 7 дней
find \$BACKUP_DIR/* -type d -mtime +7 -exec rm -rf {} \;
EOF

# Сделать скрипт исполняемым
chmod +x /home/$(whoami)/backup-mongodb.sh
```

Добавьте задание в crontab для запуска резервного копирования каждый день:

```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$(whoami)/backup-mongodb.sh") | crontab -
```

## Мониторинг приложения

Вы можете использовать различные инструменты для мониторинга:

1. PM2 предоставляет базовый мониторинг: `pm2 monit`
2. PM2 Plus - расширенный мониторинг (платный): https://pm2.io/
3. Настройка мониторинга Prometheus и Grafana (для продвинутого мониторинга)

## Проверка безопасности

```bash
# Проверка зависимостей на уязвимости
npm audit

# Базовая проверка портов
sudo ss -tulpn

# Логи безопасности
sudo tail -f /var/log/auth.log
```

## Дополнительные рекомендации

1. Настройте регулярные обновления безопасности:
   ```bash
   sudo apt install -y unattended-upgrades
   ```

2. Рассмотрите использование CDN для статических ресурсов
3. Настройте резервное копирование всего сервера
4. Настройте мониторинг доступности сервера с уведомлениями