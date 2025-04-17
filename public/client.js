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
  
  // История сообщений
  let messageHistory = [];
  let isMessageHistoryVisible = false;
  let currentMessageIndex = -1;
  let messageHistoryContainer = null;
  
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
    
    // Сохраняем сообщение в историю
    messageHistory.push({
      text: text,
      opacity: opacity || settings.textOpacity,
      timestamp: new Date()
    });
    
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
  
  // Создание интерфейса для просмотра истории сообщений
  function createMessageHistoryInterface() {
    // Если контейнер уже существует, просто показываем его
    if (messageHistoryContainer) {
      messageHistoryContainer.style.display = 'block';
      return;
    }
    
    // Создаем контейнер для истории сообщений
    messageHistoryContainer = document.createElement('div');
    messageHistoryContainer.id = 'message-history-container';
    
    // Стилизуем контейнер
    Object.assign(messageHistoryContainer.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '300px',
      maxHeight: '400px',
      backgroundColor: 'white',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
      borderRadius: '8px',
      padding: '10px',
      zIndex: '1000000',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    });
    
    // Создаем заголовок
    const header = document.createElement('div');
    header.innerText = 'История сообщений';
    Object.assign(header.style, {
      fontWeight: 'bold',
      borderBottom: '1px solid #eee',
      padding: '0 0 10px 0',
      marginBottom: '10px',
      fontSize: '14px'
    });
    
    // Создаем контейнер для сообщений
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'messages-list';
    Object.assign(messagesContainer.style, {
      overflow: 'auto',
      flex: '1',
      marginBottom: '10px'
    });
    
    // Создаем панель с инструкциями
    const instructions = document.createElement('div');
    instructions.innerHTML = `
      <div style="font-size: 11px; color: #666; margin-top: 10px;">
        <div>← → - Листать сообщения</div>
        <div>Alt+Q - Скрыть/Показать историю</div>
        <div>Esc - Скрыть историю</div>
      </div>
    `;
    
    // Создаем кнопку закрытия
    const closeButton = document.createElement('button');
    closeButton.innerText = '✕';
    Object.assign(closeButton.style, {
      position: 'absolute',
      top: '5px',
      right: '5px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      color: '#666'
    });
    closeButton.addEventListener('click', hideMessageHistory);
    
    // Добавляем элементы в контейнер
    messageHistoryContainer.appendChild(header);
    messageHistoryContainer.appendChild(messagesContainer);
    messageHistoryContainer.appendChild(instructions);
    messageHistoryContainer.appendChild(closeButton);
    
    // Добавляем контейнер в DOM
    document.body.appendChild(messageHistoryContainer);
  }
  
  // Отображение сообщения из истории
  function displayMessageFromHistory(index) {
    if (index < 0 || index >= messageHistory.length) return;
    
    currentMessageIndex = index;
    const messagesContainer = document.getElementById('messages-list');
    if (!messagesContainer) return;
    
    // Очищаем контейнер
    messagesContainer.innerHTML = '';
    
    // Добавляем информацию о текущем сообщении
    const messageInfo = document.createElement('div');
    messageInfo.innerHTML = `<div style="font-size: 12px; color: #999; margin-bottom: 5px;">Сообщение ${index + 1} из ${messageHistory.length}</div>`;
    messagesContainer.appendChild(messageInfo);
    
    // Получаем сообщение
    const message = messageHistory[index];
    
    // Создаем элемент для отображения сообщения
    const messageElement = document.createElement('div');
    messageElement.innerText = message.text;
    Object.assign(messageElement.style, {
      border: '1px solid #eee',
      padding: '10px',
      borderRadius: '5px',
      backgroundColor: '#f9f9f9',
      fontSize: '13px',
      marginBottom: '5px'
    });
    
    // Добавляем дату/время
    const timestampElement = document.createElement('div');
    timestampElement.innerText = formatTimestamp(message.timestamp);
    Object.assign(timestampElement.style, {
      fontSize: '11px',
      color: '#999',
      textAlign: 'right'
    });
    
    // Добавляем элементы в контейнер
    messagesContainer.appendChild(messageElement);
    messagesContainer.appendChild(timestampElement);
  }
  
  // Форматирование времени
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }
  
  // Показать историю сообщений
  function showMessageHistory() {
    isMessageHistoryVisible = true;
    createMessageHistoryInterface();
    
    // Показываем последнее сообщение если есть
    if (messageHistory.length > 0) {
      currentMessageIndex = messageHistory.length - 1;
      displayMessageFromHistory(currentMessageIndex);
    } else {
      const messagesContainer = document.getElementById('messages-list');
      if (messagesContainer) {
        messagesContainer.innerHTML = '<div style="color: #999; font-size: 13px; text-align: center; padding: 20px;">Нет сохраненных сообщений</div>';
      }
    }
  }
  
  // Скрыть историю сообщений
  function hideMessageHistory() {
    isMessageHistoryVisible = false;
    if (messageHistoryContainer) {
      messageHistoryContainer.style.display = 'none';
    }
  }
  
  // Обработчик нажатия клавиш
  function handleKeyDown(event) {
    // Alt+Q для показа/скрытия истории сообщений
    if (event.altKey && event.code === 'KeyQ') {
      event.preventDefault();
      if (isMessageHistoryVisible) {
        hideMessageHistory();
      } else {
        showMessageHistory();
      }
    }
    
    // Если история сообщений видима, обрабатываем стрелки и Esc
    if (isMessageHistoryVisible) {
      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        if (currentMessageIndex > 0) {
          displayMessageFromHistory(currentMessageIndex - 1);
        }
      } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        if (currentMessageIndex < messageHistory.length - 1) {
          displayMessageFromHistory(currentMessageIndex + 1);
        }
      } else if (event.code === 'Escape') {
        event.preventDefault();
        hideMessageHistory();
      }
    }
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
  
  // Добавляем обработчик нажатия клавиш
  document.addEventListener('keydown', handleKeyDown);
  
  // Запускаем подключение к серверу
  connectToServer();
})(); 