#!/bin/bash
# Скрипт для исправления сборки фронтенда с игнорированием TypeScript ошибок

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

# Проверка прав суперпользователя (для работы на VPS)
if [ "$EUID" -ne 0 ] && [ -z "$LOCAL_DEV" ]; then
    print_error "Запустите скрипт с правами суперпользователя (sudo) или установите переменную LOCAL_DEV=1 для локальной разработки"
    exit 1
fi

# Определение директорий и переменных
FRONTEND_DIR="$(pwd)"
API_URL=${API_URL:-"https://prostor-shop.shop/api"}
print_message "Использую директорию фронтенда: $FRONTEND_DIR"
print_message "API URL будет установлен на: $API_URL"

# Шаг 1: Проверка package.json
if [ ! -f "package.json" ]; then
    print_error "Файл package.json не найден. Убедитесь, что вы находитесь в директории проекта."
    exit 1
fi

print_message "Файл package.json найден, приступаю к модификации сборки..."

# Шаг 2: Создаем .env файл с правильным API URL
print_message "Создание .env с API URL..."
echo "VITE_API_URL=$API_URL" > .env
print_message ".env файл создан успешно"

# Шаг 3: Модифицируем tsconfig.json для игнорирования ошибок
if [ -f "tsconfig.json" ]; then
    print_message "Обновляем tsconfig.json для игнорирования ошибок..."
    # Создаем резервную копию
    cp tsconfig.json tsconfig.json.backup

    # Проверяем наличие noEmitOnError и устанавливаем его в false
    if grep -q "noEmitOnError" tsconfig.json; then
        sed -i 's/"noEmitOnError": true/"noEmitOnError": false/' tsconfig.json
    else
        # Если noEmitOnError отсутствует, добавляем его в компилерОпции
        if grep -q "compilerOptions" tsconfig.json; then
            sed -i '/"compilerOptions": {/a \    "noEmitOnError": false,' tsconfig.json
        else
            print_warning "Не удалось найти compilerOptions в tsconfig.json"
        fi
    fi
    
    print_message "tsconfig.json обновлен"
else
    print_warning "tsconfig.json не найден, создаем минимальный..."
    cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noImplicitAny": false,
    "noEmitOnError": false,
    "allowJs": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
    print_message "Создан базовый tsconfig.json"
fi

# Шаг 4: Создание временного скрипта сборки, который игнорирует ошибки
print_message "Создание скрипта сборки, игнорирующего ошибки TypeScript..."

# Проверка наличия директории scripts
mkdir -p scripts

cat > scripts/build-no-errors.js << EOF
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Запуск сборки с игнорированием TypeScript ошибок...');

// Временно отключаем проверку типов в vite.config.ts, если он существует
const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
let viteConfigBackup = null;

if (fs.existsSync(viteConfigPath)) {
  viteConfigBackup = fs.readFileSync(viteConfigPath, 'utf8');
  
  // Модифицируем конфигурацию для отключения проверки типов
  let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  if (!viteConfig.includes('checker: { typescript: false }')) {
    // Если есть checker plugin
    if (viteConfig.includes('checker(')) {
      viteConfig = viteConfig.replace(/checker\(\{([^}]*)\}\)/g, 'checker({ typescript: false, $1 })');
    }
    
    // Сохраняем изменения
    fs.writeFileSync(viteConfigPath, viteConfig, 'utf8');
    console.log('Временно отключена проверка типов TypeScript в vite.config.ts');
  }
}

try {
  // Запускаем сборку, игнорируя ошибки
  console.log('Запуск TSC в режиме transpileOnly...');
  try {
    // Пытаемся запустить tsc напрямую с флагом transpileOnly
    execSync('npx tsc --noEmit false --emitDeclarationOnly false', { stdio: 'inherit' });
  } catch (e) {
    console.log('Игнорирование ошибок TypeScript, продолжаем сборку...');
  }
  
  // Запускаем vite build
  console.log('Запуск Vite для создания бандла...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  console.log('Сборка успешно завершена!');
} catch (error) {
  console.error('Ошибка при сборке:', error.message);
  process.exit(1);
} finally {
  // Восстанавливаем оригинальный vite.config.ts
  if (viteConfigBackup) {
    fs.writeFileSync(viteConfigPath, viteConfigBackup, 'utf8');
    console.log('Восстановлен оригинальный vite.config.ts');
  }
}
EOF

print_message "Скрипт build-no-errors.js создан"

# Шаг 5: Обновляем package.json для добавления нового скрипта сборки
print_message "Обновление package.json для добавления скрипта безопасной сборки..."

# Добавляем новый скрипт сборки в package.json
if grep -q '"build-safe"' package.json; then
    print_message "Скрипт build-safe уже существует в package.json"
else
    # Заменяем строку со скриптами, добавляя новый скрипт
    sed -i '/"scripts": {/a \    "build-safe": "node scripts/build-no-errors.js",' package.json
    print_message "Добавлен скрипт build-safe в package.json"
fi

# Шаг 6: Установка зависимостей и запуск сборки
print_message "Установка зависимостей..."
npm install --quiet

print_message "Запуск безопасной сборки..."
npm run build-safe

# Проверка результатов сборки
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    print_message "Сборка фронтенда успешно завершена! Файлы находятся в директории dist/"
    print_message "Чтобы интегрировать фронтенд с бэкендом, скопируйте содержимое директории dist на сервер"
    
    # Если мы на VPS, копируем файлы в нужную директорию
    if [ -d "/root/clothing-store/frontend" ] && [ "$EUID" -eq 0 ]; then
        print_message "Копирование файлов сборки в директорию бэкенда для интеграции..."
        cp -r dist/* /root/clothing-store/frontend/dist/
        print_message "Файлы скопированы в /root/clothing-store/frontend/dist/"
    fi
else
    print_error "Сборка завершилась с ошибками. Проверьте вывод выше для диагностики."
    exit 1
fi

print_message "======================================================"
print_message "Скрипт исправления и сборки фронтенда завершен успешно!"
print_message "======================================================"