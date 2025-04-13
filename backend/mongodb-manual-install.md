# Ручная установка MongoDB на Ubuntu

Если у вас возникли проблемы с автоматической установкой MongoDB через скрипт, следуйте этим пошаговым инструкциям для установки MongoDB вручную.

## Метод 1: Установка через официальный репозиторий

### 1. Установка зависимостей

```bash
sudo apt update
sudo apt install -y gnupg curl
```

### 2. Импорт публичного ключа MongoDB

```bash
# Удалите старые ключи, если они существуют
sudo rm -f /usr/share/keyrings/mongodb-server-*

# Импортируйте ключ
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
    sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
```

### 3. Создание файла источника для MongoDB

```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
```

### 4. Установка MongoDB

```bash
sudo apt update
sudo apt install -y mongodb-org
```

### 5. Запуск службы MongoDB

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 6. Проверка статуса MongoDB

```bash
sudo systemctl status mongod
```

## Метод 2: Установка через Snap

Если установка через репозиторий не работает, попробуйте использовать Snap (доступно на большинстве современных дистрибутивов Ubuntu):

```bash
sudo snap install mongodb
```

## Метод 3: Использование MongoDB Atlas (облачное решение)

Если вы не можете установить MongoDB на ваш сервер, рассмотрите вариант использования MongoDB Atlas - облачного решения от разработчиков MongoDB.

1. Зарегистрируйтесь на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Создайте бесплатный кластер (M0)
3. Настройте доступ из вашего IP-адреса
4. Создайте пользователя базы данных
5. Получите строку подключения (URI) и используйте её в вашем приложении

После получения URI подключения, измените настройку в файле `.env`:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<dbname>?retryWrites=true&w=majority
```

## Проблемы с совместимостью версий

Если ваш дистрибутив Ubuntu не поддерживается официальным репозиторием MongoDB, попробуйте следующее:

### Проверка версии Ubuntu

```bash
lsb_release -a
```

### Установка для более старых версий Ubuntu (например, для 18.04, если репозиторий для вашей версии отсутствует)

```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
```

### Установка MongoDB 5.0 (если версия 6.0 не устанавливается)

```bash
curl -fsSL https://pgp.mongodb.com/server-5.0.asc | \
    sudo gpg -o /usr/share/keyrings/mongodb-server-5.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-5.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list

sudo apt update
sudo apt install -y mongodb-org
```

## Решение проблемы "Unable to locate package mongodb-org"

Если вы видите ошибку `E: Unable to locate package mongodb-org`, это означает, что в вашей системе нет доступа к репозиторию MongoDB. Выполните следующие шаги по порядку:

### 1. Определите версию вашей Ubuntu

```bash
lsb_release -a
```

Запомните значение в поле "Codename" (например, focal, jammy, bionic и т.д.).

### 2. Правильное добавление репозитория MongoDB для вашей версии Ubuntu

```bash
# Установите необходимые пакеты
sudo apt update
sudo apt install -y gnupg wget curl

# Импортируйте ключи MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Добавьте репозиторий MongoDB для вашей версии Ubuntu
# Замените "$(lsb_release -sc)" на кодовое имя вашей версии Ubuntu,
# если команда не работает корректно
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -sc)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Обновите информацию о пакетах
sudo apt update
```

### 3. Если шаги выше не работают, укажите кодовое имя Ubuntu вручную

Если ваша версия Ubuntu не полностью поддерживается MongoDB, попробуйте использовать ближайшую поддерживаемую версию:

```bash
# Для Ubuntu 22.04 (jammy)
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Для Ubuntu 20.04 (focal)
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Для Ubuntu 18.04 (bionic)
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Обновите информацию о пакетах
sudo apt update
```

### 4. Используйте более новый формат подписи для Ubuntu 22.04+

В Ubuntu 22.04 и новее изменилась работа с ключами репозиториев. Попробуйте этот метод:

```bash
# Удалите старые ключи, если они есть
sudo rm -f /usr/share/keyrings/mongodb-server-*
sudo rm -f /etc/apt/sources.list.d/mongodb-org-*

# Импортируйте ключ нужным образом
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
    sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg

# Добавьте репозиторий с правильной подписью
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -sc)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Обновите информацию о пакетах
sudo apt update
```

### 5. Убедитесь, что multiverse репозиторий включен

```bash
sudo add-apt-repository multiverse
sudo apt update
```

### 6. Попробуйте установить более старую версию MongoDB

Если MongoDB 6.0 недоступен, попробуйте более старую версию:

```bash
# Импорт ключа MongoDB 5.0
curl -fsSL https://pgp.mongodb.com/server-5.0.asc | \
    sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-5.0.gpg

# Добавление репозитория MongoDB 5.0
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-5.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -sc)/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list

# Обновление и установка
sudo apt update
sudo apt install -y mongodb-org
```

### 7. Использование MongoDB через snap (рекомендуется при проблемах с репозиториями)

Snap-пакеты работают на всех современных версиях Ubuntu:

```bash
# Установка MongoDB через snap
sudo snap install mongodb

# Проверка статуса
sudo systemctl status snap.mongodb.mongod

# Если служба не запущена, запустите её
sudo systemctl start snap.mongodb.mongod
sudo systemctl enable snap.mongodb.mongod
```

Важно: При использовании snap версии MongoDB, путь к исполняемым файлам и файлам конфигурации будет отличаться от стандартной установки.

### 8. Проверка правильности установки

После успешной установки MongoDB (любым методом), проверьте:

```bash
# Проверка статуса службы (для apt установки)
sudo systemctl status mongod

# или для snap установки
sudo systemctl status snap.mongodb.mongod

# Проверка подключения к MongoDB
mongosh --eval "db.version()" 
# или
mongo --eval "db.version()"
```

### 9. Изменение URI подключения в вашем приложении

После установки MongoDB через snap, измените URI подключения в вашем файле `.env`:

Для стандартной установки (apt):
```
MONGODB_URI=mongodb://localhost:27017/clothing-store
```

Для snap-установки:
```
MONGODB_URI=mongodb://localhost:27017/clothing-store
```

URI одинаковый, но убедитесь, что mongod запущен в правильной конфигурации.

## Диагностика проблем

### Проверка логов MongoDB

```bash
sudo tail -f /var/log/mongodb/mongod.log
```

### Проверка состояния службы

```bash
sudo systemctl status mongod
```

### Проверка, что MongoDB прослушивает порт 27017

```bash
sudo ss -tulpn | grep 27017
```

### Устранение проблем с правами доступа к каталогам данных

```bash
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown mongodb:mongodb /tmp/mongodb-27017.sock
```

### Перезапуск MongoDB после изменений

```bash
sudo systemctl restart mongod
```

## Установка альтернативных клиентов MongoDB

Если у вас есть проблемы с командой `mongo`:

```bash
# Mongo Shell (новая версия)
sudo apt install -y mongodb-mongosh

# Инструменты MongoDB
sudo apt install -y mongodb-database-tools
```

## Настройка брандмауэра для MongoDB

В производственной среде рекомендуется ограничить доступ к MongoDB только с определенных IP-адресов.

```bash
# Разрешить доступ с конкретного IP-адреса
sudo ufw allow from your_trusted_ip_address to any port 27017

# Если MongoDB должен быть доступен только локально
sudo ufw deny 27017/tcp
```

## Изменение конфигурации MongoDB

Если вам нужно изменить конфигурацию MongoDB:

```bash
sudo nano /etc/mongod.conf
```

После изменений перезапустите службу:

```bash
sudo systemctl restart mongod
```