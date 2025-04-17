/**
 * Клиентский скрипт для сбора данных со страницы
 * Внедряется через букмарклет: 
 * javascript:(function(){var s=document.createElement('script');s.src='http://localhost:3000/client.js';document.body.appendChild(s);})()
 */

(function() {
  // Проверяем, не запущен ли скрипт уже
  if (window.webMonitoringClientActive) {
    console.warn('Клиент мониторинга уже запущен на этой странице');
    return;
  }
  
  // Отмечаем, что скрипт запущен
  window.webMonitoringClientActive = true;
  
  // Настройки
  let settings = {
    updateInterval: 25 * 60 * 1000, // 25 минут в миллисекундах
    textOpacity: 0.7
  };
  
  // ID клиента и статусы
  let clientId = null;
  let isPaused = false;
  let updateTimer = null;
  let reconnectAttempts = 0;
  let ws = null;
  
  // Подключение к серверу
  function connectToServer() {
    // Определяем хост сервера динамически на основе текущего скрипта
    const scriptSrc = document.currentScript ? document.currentScript.src : 'http://localhost:3000/client.js';
    const serverUrl = scriptSrc.replace('/client.js', '').replace('http', 'ws');
    
    ws = new WebSocket(serverUrl);
    
    ws.onopen = function() {
      console.log('Подключение к серверу установлено');
      reconnectAttempts = 0;
      
      // Регистрируемся на сервере
      ws.send(JSON.stringify({
        type: 'register',
        role: 'client'
      }));
    };
    
    ws.onmessage = function(event) {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'registered':
            clientId = message.clientId;
            
            // Применяем полученные от сервера настройки
            if (message.settings) {
              settings = message.settings;
            }
            
            console.log(`Зарегистрирован как клиент: ${clientId}`);
            
            // Запускаем сбор данных
            startDataCollection();
            break;
            
          case 'pause':
            isPaused = true;
            stopDataCollection();
            console.log('Сбор данных приостановлен');
            break;
            
          case 'resume':
            isPaused = false;
            startDataCollection();
            console.log('Сбор данных возобновлен');
            break;
            
          case 'remove':
            stopDataCollection();
            disconnectFromServer();
            window.webMonitoringClientActive = false;
            console.log('Клиент удален');
            break;
            
          case 'message':
            displayMessage(message.text, message.opacity);
            break;
            
          case 'settingsUpdate':
            if (message.settings) {
              settings = message.settings;
              console.log('Настройки обновлены', settings);
              
              // Перезапускаем сбор данных с новыми настройками
              if (!isPaused) {
                stopDataCollection();
                startDataCollection();
              }
            }
            break;
        }
      } catch (error) {
        console.error('Ошибка обработки сообщения:', error);
      }
    };
    
    ws.onclose = function() {
      console.log('Соединение с сервером закрыто');
      
      // Останавливаем сбор данных
      stopDataCollection();
      
      // Пытаемся переподключиться с увеличивающейся задержкой
      if (window.webMonitoringClientActive) {
        const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
        reconnectAttempts++;
        
        console.log(`Попытка переподключения через ${delay}мс...`);
        setTimeout(connectToServer, delay);
      }
    };
    
    ws.onerror = function(error) {
      console.error('Ошибка WebSocket:', error);
    };
  }
  
  // Отключение от сервера
  function disconnectFromServer() {
    if (ws) {
      ws.close();
      ws = null;
    }
  }
  
  // Сбор данных со страницы
  function collectPageData() {
    try {
      // Эмулируем jQuery, если он не доступен
      if (!window.jQuery) {
        emulateJQuery();
      }
      
      const data = {
        type: 'update',
        url: window.location.href,
        title: document.title,
        text: extractPageText(),
        html: document.documentElement.outerHTML
      };
      
      // Отправляем данные на сервер
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
        console.log('Данные страницы отправлены на сервер');
      }
    } catch (error) {
      console.error('Ошибка сбора данных:', error);
    }
  }
  
  // Извлечение текста страницы
  function extractPageText() {
    // Получаем текст из body, игнорируя скрипты и стили
    const bodyText = document.body.innerText || '';
    
    // Удаляем лишние пробелы и переносы строк
    return bodyText.replace(/\\s+/g, ' ').trim();
  }
  
  // Запуск сбора данных
  function startDataCollection() {
    if (isPaused) return;
    
    // Собираем данные сразу при запуске
    collectPageData();
    
    // Настраиваем периодический сбор данных
    updateTimer = setInterval(collectPageData, settings.updateInterval);
    console.log(`Настроен сбор данных каждые ${settings.updateInterval / 60000} минут`);
  }
  
  // Остановка сбора данных
  function stopDataCollection() {
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
  }
  
  // Отображение сообщения от админа
  function displayMessage(text, opacity) {
    // Удаляем предыдущее сообщение, если есть
    const existingMsg = document.getElementById('admin-message');
    if (existingMsg) {
      existingMsg.remove();
    }
    
    // Создаем контейнер для сообщения
    const msgElement = document.createElement('div');
    msgElement.id = 'admin-message';
    msgElement.innerText = text;
    
    // Стилизуем элемент
    Object.assign(msgElement.style, {
      position: 'fixed',
      left: '10px',
      bottom: '10px',
      fontSize: '8px',
      color: '#999',
      opacity: opacity || settings.textOpacity,
      zIndex: '999999',
      pointerEvents: 'none',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '200px',
      padding: '5px',
      backgroundColor: 'transparent',
      borderRadius: '3px'
    });
    
    // Добавляем в DOM
    document.body.appendChild(msgElement);
    
    // Автоматически удаляем через 0.7 секунд
    setTimeout(() => {
      if (msgElement.parentNode) {
        msgElement.remove();
      }
    }, 700);
  }
  
  // Эмуляция базового функционала jQuery
  function emulateJQuery() {
    window.jQuery = function(selector) {
      const elements = document.querySelectorAll(selector);
      
      return {
        text: function() {
          if (elements.length > 0) {
            return elements[0].innerText;
          }
          return '';
        },
        html: function() {
          if (elements.length > 0) {
            return elements[0].innerHTML;
          }
          return '';
        },
        find: function(childSelector) {
          if (elements.length > 0) {
            const found = elements[0].querySelectorAll(childSelector);
            return window.jQuery(found);
          }
          return window.jQuery([]);
        }
      };
    };
    
    window.$ = window.jQuery;
  }
  
  // Запускаем подключение к серверу
  connectToServer();
})(); 