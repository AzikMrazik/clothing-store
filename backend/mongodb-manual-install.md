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