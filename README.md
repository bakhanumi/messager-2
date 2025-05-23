# Система мониторинга веб-страниц

Это проект для мониторинга веб-страниц с клиент-серверной архитектурой на основе WebSocket.

## Компоненты проекта

Проект состоит из трех основных компонентов:

1. **Клиентский скрипт (`client.js`)** - внедряется на веб-страницы через букмарклет.
2. **Серверная часть (`server.js`)** - обрабатывает подключения и данные.
3. **Админ-панель (`admin.html`)** - позволяет управлять клиентами и просматривать данные.

## Установка и запуск

### Предварительные требования

- Node.js (версия 14+)
- npm

### Установка

1. Клонируйте репозиторий или скачайте файлы проекта.
2. Установите зависимости:

```bash
npm install
```

### Запуск

Для запуска сервера выполните:

```bash
npm start
```

По умолчанию сервер запускается на порту 3000. Вы можете изменить порт, установив переменную окружения `PORT`.

## Использование

### Добавление клиентского скрипта на страницу

Вы можете добавить клиентский скрипт на страницу с помощью букмарклета:

1. Создайте новую закладку в браузере
2. В поле URL введите следующий код:

```javascript
javascript:(function(){var s=document.createElement('script');s.src='http://localhost:3000/client.js';document.body.appendChild(s);})()
```

> **Примечание:** Замените `localhost:3000` на фактический адрес вашего сервера, если он развернут в другом месте.

### Доступ к админ-панели

Админ-панель доступна по адресу:

```
http://localhost:3000/admin
```

### Функции админ-панели

- Просмотр списка подключенных клиентов
- Просмотр данных страницы (превью, HTML, текст)
- Управление клиентами (пауза/возобновление, удаление)
- Отправка сообщений клиентам
- Настройка интервала обновления данных

## Технические детали

### Функциональность клиентского скрипта

- Сбор данных со страницы (URL, заголовок, HTML, текст)
- Автоматическое переподключение к серверу при обрыве связи
- Периодическая отправка данных (настраивается через админ-панель)
- Отображение сообщений от админ-панели
- Эмуляция jQuery для страниц без jQuery

### Функциональность сервера

- Обработка WebSocket подключений
- Управление клиентами и админами
- Пересылка данных между клиентами и админ-панелью
- Мониторинг активности соединений

## Развертывание

Проект может быть развернут на хостинг-платформах, поддерживающих Node.js, например:

- Render.com
- Heroku
- Vercel
- DigitalOcean

При развертывании не забудьте обновить URL в букмарклете на актуальный адрес вашего сервера.

## Примечания по безопасности

- Система предназначена для мониторинга и не включает аутентификацию или авторизацию.
- При развертывании в производственной среде рекомендуется добавить базовую аутентификацию и HTTPS. 