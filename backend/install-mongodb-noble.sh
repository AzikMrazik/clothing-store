#!/bin/bash
# Скрипт для установки MongoDB на Ubuntu 24.04 (Noble Numbat)
# Так как официальные репозитории MongoDB еще не поддерживают Noble,
# используем установку через snap

echo "Установка MongoDB на Ubuntu 24.04 (Noble Numbat)"

# Проверяем, установлен ли уже MongoDB
if command -v mongod &> /dev/null; then
    echo "MongoDB уже установлен: $(mongod --version | head -n 1)"
    echo "Проверка статуса службы MongoDB..."
    sudo systemctl status mongod || echo "MongoDB не запущен как системный сервис"
    exit 0
fi

echo "Установка MongoDB через snap..."
sudo snap install mongodb

# Проверяем успешность установки
if ! command -v mongo &> /dev/null && ! command -v mongosh &> /dev/null; then
    echo "Установка MongoDB через snap не удалась. Проверяем доступность команды через полный путь..."
    
    if [ -f "/snap/bin/mongo" ]; then
        echo "MongoDB установлен в /snap/bin/mongo"
    elif [ -f "/snap/bin/mongosh" ]; then
        echo "MongoDB Shell установлен в /snap/bin/mongosh"
    else
        echo "MongoDB не найден. Попробуем альтернативный метод..."
        
        # Пробуем установить из репозитория Ubuntu 22.04 (jammy)
        echo "Попытка использования репозитория для Ubuntu 22.04 (jammy)..."
        
        # Удаление неработающего репозитория
        sudo rm -f /etc/apt/sources.list.d/mongodb-org-6.0.list
        
        # Импорт ключа
        wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
        
        # Добавление репозитория для jammy (Ubuntu 22.04)
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
        
        sudo apt update
        sudo apt install -y mongodb-org
        
        # Запуск MongoDB
        sudo systemctl start mongod
        sudo systemctl enable mongod
        
        echo "Проверка статуса MongoDB..."
        sudo systemctl status mongod
    fi
fi

# Проверяем статус для snap установки
if systemctl list-unit-files | grep -q snap.mongodb.mongod; then
    echo "Запуск MongoDB (snap)..."
    sudo systemctl start snap.mongodb.mongod
    sudo systemctl enable snap.mongodb.mongod
    echo "Проверка статуса MongoDB (snap)..."
    sudo systemctl status snap.mongodb.mongod
fi

# Проверка доступности MongoDB
echo "Проверка подключения к MongoDB..."
mongo --eval "db.version()" || mongosh --eval "db.version()" || \
/snap/bin/mongo --eval "db.version()" || /snap/bin/mongosh --eval "db.version()" || \
echo "ВНИМАНИЕ: Невозможно проверить версию MongoDB. Проверьте установку вручную."

echo "Создание тестовой базы данных..."
mongo --eval "db.test.insert({name: 'test'})" || mongosh --eval "db.test.insert({name: 'test'})" || \
/snap/bin/mongo --eval "db.test.insert({name: 'test'})" || /snap/bin/mongosh --eval "db.test.insert({name: 'test'})" || \
echo "ВНИМАНИЕ: Невозможно создать тестовую запись."

echo "Настройка для приложения..."
echo "MONGODB_URI=mongodb://localhost:27017/clothing-store" > .env.mongodb

echo "MongoDB установлен и настроен."
echo "Используйте следующий URI для подключения: mongodb://localhost:27017/clothing-store"
echo "Примечание: если вы используете snap версию, доступ к MongoDB может быть ограничен политиками безопасности snap."