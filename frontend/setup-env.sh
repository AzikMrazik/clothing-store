#!/bin/bash

# Скрипт для автоматической настройки .env файлов на сервере

# Проверяем аргументы
if [ "$#" -lt 1 ]; then
    echo "Использование: $0 <api-url> [node-env]"
    echo "Пример: $0 https://api.example.com production"
    exit 1
fi

API_URL=$1
NODE_ENV=${2:-production}

# Создаем основной .env файл
cat > .env << EOF
# Основные настройки окружения
VITE_NODE_ENV=$NODE_ENV
VITE_API_URL=$API_URL

# Настройки безопасности
VITE_ENABLE_CSP=true
VITE_DISABLE_CONSOLE_IN_PRODUCTION=true

# Настройки для CSRF защиты
VITE_CSRF_ENABLED=true
VITE_CSRF_HEADER_NAME=CSRF-Token

# Время жизни JWT токена на фронтенде (в секундах)
VITE_TOKEN_EXPIRY=28800

# Настройки для мониторинга безопасности
VITE_SECURITY_MONITORING_ENABLED=true
VITE_SECURITY_REPORT_ERRORS=true

# Настройки для загрузки файлов
VITE_MAX_UPLOAD_SIZE=5242880  # 5MB в байтах
VITE_ALLOWED_UPLOAD_MIME_TYPES=image/jpeg,image/png,image/webp,application/pdf,text/csv
EOF

# Создаем .env.production файл
cat > .env.production << EOF
# Основные настройки продакшен-окружения
VITE_NODE_ENV=production
VITE_API_URL=$API_URL

# Настройки безопасности
VITE_ENABLE_CSP=true
VITE_DISABLE_CONSOLE_IN_PRODUCTION=true

# Настройки для CSRF защиты
VITE_CSRF_ENABLED=true
VITE_CSRF_HEADER_NAME=CSRF-Token

# Время жизни JWT токена на фронтенде (в секундах)
VITE_TOKEN_EXPIRY=28800

# Настройки для мониторинга безопасности
VITE_SECURITY_MONITORING_ENABLED=true
VITE_SECURITY_REPORT_ERRORS=true

# Настройки для загрузки файлов
VITE_MAX_UPLOAD_SIZE=5242880  # 5MB в байтах
VITE_ALLOWED_UPLOAD_MIME_TYPES=image/jpeg,image/png,image/webp,application/pdf,text/csv
EOF

echo "✅ Файлы окружения созданы с API_URL=$API_URL и NODE_ENV=$NODE_ENV"
echo "⚠️ Убедитесь, что URL бэкенда доступен перед сборкой фронтенда"