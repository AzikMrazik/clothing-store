# Завершение настройки приложения после добавления домена

После первичной настройки домена в Nginx и Cloudflare, нужно правильно настроить бэкенд-приложение для работы с доменом и запустить его через PM2.

## 1. Создание и настройка файла .env

```bash
# Перейдите в директорию бэкенда
cd /var/www/clothing-store/backend

# Создайте файл .env с необходимыми настройками
cat > .env << EOF
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
CORS_ORIGIN=https://prostor-shop.shop,https://www.prostor-shop.shop
EOF

echo "Файл .env создан с настройками для домена prostor-shop.shop"
```

## 2. Установка зависимостей и сборка приложения

```bash
# Убедитесь, что вы в директории бэкенда
cd /var/www/clothing-store/backend

# Установите зависимости и выполните сборку
npm install --production
npm run build

echo "Зависимости установлены и приложение собрано"
```

## 3. Запуск приложения через PM2

```bash
# Установите PM2, если он еще не установлен
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
  echo "PM2 установлен"
fi

# Запустите приложение через PM2
cd /var/www/clothing-store/backend
pm2 start dist/index.js --name "clothing-store" --env production

# Настройте автозапуск PM2
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
pm2 save

echo "Приложение запущено через PM2 с именем clothing-store"
```

## 4. Проверка работы приложения и logrotate

```bash
# Создание директории для логов
mkdir -p /var/www/clothing-store/backend/logs

# Проверка логов приложения
pm2 logs clothing-store

# Настройка logrotate для логов PM2
sudo tee /etc/logrotate.d/pm2-clothing-store > /dev/null << EOF
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

echo "Настройка логов завершена"
```

## 5. Повторное получение SSL-сертификата

После того как DNS-записи обновятся (может занять до 48 часов, но обычно быстрее):

```bash
sudo certbot --nginx -d prostor-shop.shop -d www.prostor-shop.shop
```

## 6. Проверка доступности приложения

```bash
# Проверка работы Nginx
sudo systemctl status nginx

# Проверка работы PM2
pm2 status

# Проверка доступных портов
sudo ss -tulpn | grep -E ':(80|443|3001)'

# Проверка FirewallD или UFW
sudo ufw status
# или
sudo firewall-cmd --list-all
```

## 7. Обновление настроек фронтенда

Если бэкенд и фронтенд находятся на разных доменах, обновите API URL в сборке фронтенда:

```bash
# Перейдите в директорию фронтенда
cd /var/www/clothing-store/frontend

# Создайте .env файл для фронтенда или обновите его
cat > .env << EOF
VITE_API_URL=https://prostor-shop.shop/api
EOF

# Установите зависимости и пересоберите 
npm install
npm run build
```

## 8. Полная проверка после настройки

Откройте браузер и проверьте:
1. https://prostor-shop.shop - должен открываться без ошибок
2. SSL-сертификат должен быть действительным (зеленый замок)
3. Проверьте основные функции сайта (регистрация, авторизация, просмотр товаров)
4. Проверьте работу API: https://prostor-shop.shop/api/health или подобный эндпоинт

## Команды для диагностики и устранения проблем

```bash
# Просмотр логов Nginx
sudo tail -f /var/log/nginx/error.log

# Просмотр логов PM2
pm2 logs

# Перезапуск Nginx
sudo systemctl restart nginx

# Перезапуск приложения
pm2 restart clothing-store

# Проверка маршрутизации
curl -I http://localhost:3001
curl -I https://prostor-shop.shop
```

Если все шаги выполнены правильно, ваш магазин должен быть доступен по адресу https://prostor-shop.shop