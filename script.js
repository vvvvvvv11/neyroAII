// script.js - Фронтенд для нейросети с OpenRouter API
document.addEventListener('DOMContentLoaded', () => {
    // ======== КОНФИГУРАЦИЯ ========
    const BACKEND_URL = 'http://localhost:3000';
    const DEFAULT_MODEL = 'mistralai/mistral-small-creative';
    
    // ======== СОСТОЯНИЕ ПРИЛОЖЕНИЯ ========
    let chatHistory = [];
    let stats = {
        messages: 0,
        tokens: 0,
        requests: 0
    };
    let isImageMode = false;
    let isTyping = false;

    // ======== ЭЛЕМЕНТЫ DOM ========
    const elements = {
        // Навигация
        navLinks: document.querySelectorAll('a[href^="#"]'),
        
        // Чат
        chatInput: document.getElementById('chat-input'),
        chatHistory: document.getElementById('chat-history'),
        chatStatus: document.getElementById('chat-status'),
        chatError: document.getElementById('chat-error'),
        errorText: document.getElementById('error-text'),
        sendBtn: document.getElementById('send-btn'),
        statusText: document.getElementById('status-text'),
        
        // Настройки
        modelSelect: document.getElementById('model-select'),
        temperature: document.getElementById('temperature'),
        tempValue: document.getElementById('temp-value'),
        maxTokens: document.getElementById('max-tokens'),
        tokensValue: document.getElementById('tokens-value'),
        
        // Модели
        modelsGrid: document.getElementById('models-grid'),
        
        // Модальное окно
        settingsModal: document.getElementById('settings-modal'),
        apiStatus: document.getElementById('api-status'),
        serverStatus: document.getElementById('server-status'),
        currentTime: document.getElementById('current-time'),
        statMessages: document.getElementById('stat-messages'),
        statTokens: document.getElementById('stat-tokens'),
        statRequests: document.getElementById('stat-requests'),
        
        // Кнопка режима изображений
        imageModeBtn: document.getElementById('image-mode-btn')
    };

    // ======== ПЛАВНЫЙ СКРОЛЛ ========
    elements.navLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerOffset = document.querySelector('.header').offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = elementPosition - headerOffset - 20;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ======== НАСТРОЙКИ ЧАТА ========
    elements.temperature.addEventListener('input', (e) => {
        elements.tempValue.textContent = e.target.value;
    });

    elements.maxTokens.addEventListener('input', (e) => {
        elements.tokensValue.textContent = e.target.value;
    });

    // ======== ОТПРАВКА СООБЩЕНИЯ ========
    async function sendMessage() {
        const message = elements.chatInput.value.trim();
        
        if (!message) {
            showError('Пожалуйста, введите сообщение');
            return;
        }

        // Добавляем сообщение пользователя в историю
        addMessageToChat(message, 'user');
        elements.chatInput.value = '';
        
        // Показываем статус загрузки
        showStatus(true);
        hideError();

        try {
            const model = elements.modelSelect.value;
            const temperature = parseFloat(elements.temperature.value);
            const maxTokens = parseInt(elements.maxTokens.value);

            if (isImageMode) {
                // Режим генерации изображений
                await generateImage(message, model, temperature, maxTokens);
            } else {
                // Режим генерации текста
                await generateText(message, model, temperature, maxTokens);
            }

        } catch (error) {
            console.error('Ошибка при отправке сообщения:', error);
            showError(`Ошибка: ${error.message}. Убедитесь, что бэкенд-сервер запущен.`);
            showStatus(false);
        }
    }

    // ======== ГЕНЕРАЦИЯ ТЕКСТА ========
    async function generateText(message, model, temperature, maxTokens) {
        // Формируем историю для запроса
        const messagesForRequest = [
            { role: 'system', content: 'Ты полезный ассистент, который отвечает на русском языке. Будь вежливым, информативным и профессиональным.' },
            ...chatHistory.slice(-10).map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            })),
            { role: 'user', content: message }
        ];

        const response = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: messagesForRequest,
                model: model,
                temperature: temperature,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Ошибка HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Неизвестная ошибка');
        }

        // Добавляем ответ нейросети в историю
        addMessageToChat(data.reply, 'ai');
        
        // Обновляем статистику
        updateStats(data.usage);

        showStatus(false);
    }

    // ======== ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ ========
    async function generateImage(message, model, temperature, maxTokens) {
        elements.statusText.textContent = 'Генерация изображения...';

        const response = await fetch(`${BACKEND_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'image',
                prompt: message,
                model: model,
                temperature: temperature,
                maxTokens: maxTokens
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Ошибка HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Неизвестная ошибка');
        }

        // Добавляем изображение в историю
        addImageToChat(data.imageUrl, 'ai');
        
        // Обновляем статистику
        updateStats(data.usage);

        showStatus(false);
    }

    // ======== ДОБАВЛЕНИЕ СООБЩЕНИЯ В ЧАТ ========
    function addMessageToChat(content, role) {
        const message = {
            role: role,
            content: content,
            timestamp: new Date().toISOString()
        };

        chatHistory.push(message);
        stats.messages++;

        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${role === 'user' ? 'user-message' : 'ai-message'}`;
        
        const avatarIcon = role === 'user' ? 'fa-user' : 'fa-robot';
        const authorName = role === 'user' ? 'Вы' : 'NeuroAI';
        const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${avatarIcon}"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${authorName}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${escapeHtml(content)}</div>
            </div>
        `;

        elements.chatHistory.appendChild(messageElement);
        elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
        
        // Сохраняем историю в localStorage
        saveChatHistory();
    }

    // ======== ДОБАВЛЕНИЕ ИЗОБРАЖЕНИЯ В ЧАТ ========
    function addImageToChat(imageUrl, role) {
        const message = {
            role: role,
            content: imageUrl,
            type: 'image',
            timestamp: new Date().toISOString()
        };

        chatHistory.push(message);
        stats.messages++;

        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${role === 'user' ? 'user-message' : 'ai-message'}`;
        
        const avatarIcon = role === 'user' ? 'fa-user' : 'fa-robot';
        const authorName = role === 'user' ? 'Вы' : 'NeuroAI';
        const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${avatarIcon}"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${authorName}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">
                    <div class="image-container">
                        <img src="${imageUrl}" alt="Сгенерированное изображение" style="max-width: 100%; border-radius: 8px; margin-top: 8px;">
                    </div>
                </div>
            </div>
        `;

        elements.chatHistory.appendChild(messageElement);
        elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
        
        // Сохраняем историю в localStorage
        saveChatHistory();
    }

    // ======== ОЧИСТКА ЧАТА ========
    function clearChat() {
        if (chatHistory.length <= 1) {
            showError('Чат уже пуст');
            return;
        }

        if (confirm('Вы уверены, что хотите очистить историю чата?')) {
            chatHistory = [];
            elements.chatHistory.innerHTML = `
                <div class="chat-message ai-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-author">NeuroAI</span>
                            <span class="message-time">Только что</span>
                        </div>
                        <div class="message-text">
                            Привет! Я NeuroAI, ваша профессиональная нейросеть на базе OpenRouter. Чем я могу помочь вам сегодня?
                        </div>
                    </div>
                </div>
            `;
            chatHistory.push({
                role: 'ai',
                content: 'Привет! Я NeuroAI, ваша профессиональная нейросеть на базе OpenRouter. Чем я могу помочь вам сегодня?',
                timestamp: new Date().toISOString()
            });
            
            // Сохраняем в localStorage
            saveChatHistory();
        }
    }

    // ======== ПЕРЕКЛЮЧЕНИЕ РЕЖИМА ИЗОБРАЖЕНИЙ ========
    function toggleImageMode() {
        isImageMode = !isImageMode;
        
        if (isImageMode) {
            elements.imageModeBtn.classList.add('btn-primary');
            elements.imageModeBtn.classList.remove('btn-secondary');
            elements.chatInput.placeholder = 'Введите описание для генерации изображения...';
            showStatus(true);
            elements.statusText.textContent = 'Режим генерации изображений активен';
            setTimeout(() => showStatus(false), 2000);
        } else {
            elements.imageModeBtn.classList.remove('btn-primary');
            elements.imageModeBtn.classList.add('btn-secondary');
            elements.chatInput.placeholder = 'Введите ваше сообщение...';
        }
    }

    // ======== УПРАВЛЕНИЕ СОСТОЯНИЯМИ ========
    function showStatus(show) {
        elements.chatStatus.style.display = show ? 'flex' : 'none';
        elements.sendBtn.disabled = show;
        elements.sendBtn.style.opacity = show ? '0.5' : '1';
    }

    function showError(message) {
        elements.errorText.textContent = message;
        elements.chatError.style.display = 'flex';
        setTimeout(() => {
            hideError();
        }, 5000);
    }

    function hideError() {
        elements.chatError.style.display = 'none';
    }

    // ======== ОБНОВЛЕНИЕ СТАТИСТИКИ ========
    function updateStats(usage) {
        if (usage) {
            stats.tokens += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
            stats.requests++;
        }

        elements.statMessages.textContent = stats.messages;
        elements.statTokens.textContent = stats.tokens.toLocaleString('ru-RU');
        elements.statRequests.textContent = stats.requests;
    }

    // ======== ЗАГРУЗКА МОДЕЛЕЙ ========
    async function loadModels() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/models`);
            
            if (!response.ok) {
                throw new Error(`Ошибка загрузки моделей: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Не удалось загрузить модели');
            }

            renderModels(data.models);

        } catch (error) {
            console.error('Ошибка при загрузке моделей:', error);
            elements.modelsGrid.innerHTML = `
                <div class="model-card" style="grid-column: 1/-1; text-align: center;">
                    <div class="model-icon" style="background: rgba(239, 68, 68, 0.15); color: var(--error-color);">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Ошибка загрузки</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    // ======== ОТРИСОВКА МОДЕЛЕЙ ========
    function renderModels(models) {
        if (!models || models.length === 0) {
            elements.modelsGrid.innerHTML = `
                <div class="model-card" style="grid-column: 1/-1; text-align: center;">
                    <div class="model-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <h3>Модели не найдены</h3>
                    <p>Попробуйте перезагрузить страницу</p>
                </div>
            `;
            return;
        }

        elements.modelsGrid.innerHTML = models.map(model => `
            <div class="model-card" onclick="selectModel('${model.id}')">
                <div class="model-icon">
                    <i class="fas fa-microchip"></i>
                </div>
                <h3>${formatModelName(model.id)}</h3>
                <p>${model.description || 'Профессиональная языковая модель'}</p>
                <div class="model-info">
                    <span><i class="fas fa-dollar-sign"></i> ${model.pricing ? '$' + model.pricing.prompt : 'N/A'}</span>
                    <span><i class="fas fa-clock"></i> ${model.top_provider ? model.top_provider.context_length : 'N/A'}</span>
                </div>
            </div>
        `).join('');
    }

    // ======== ФОРМАТИРОВАНИЕ НАЗВАНИЯ МОДЕЛИ ========
    function formatModelName(modelId) {
        const names = {
            'mistralai/mistral-small-creative': 'Mistral Small Creative',
            'openai/gpt-4o-mini': 'GPT-4o Mini',
            'openai/gpt-4o': 'GPT-4o',
            'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
            'meta-llama/llama-3.1-70b-instruct': 'Llama 3.1 70B',
            'mistralai/mistral-nemo': 'Mistral Nemo'
        };
        return names[modelId] || modelId.split('/').pop().replace(/-/g, ' ').toUpperCase();
    }

    // ======== ВЫБОР МОДЕЛИ ========
    window.selectModel = function(modelId) {
        elements.modelSelect.value = modelId;
        scrollToChat();
        
        // Добавляем сообщение о смене модели
        addMessageToChat(`Модель изменена на: ${formatModelName(modelId)}`, 'ai');
    };

    // ======== ПРОВЕРКА СТАТУСА СЕРВЕРА ========
    async function checkServerStatus() {
        elements.serverStatus.textContent = 'Проверка...';
        elements.serverStatus.style.color = 'var(--warning-color)';

        try {
            const response = await fetch(`${BACKEND_URL}/health`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === 'ok') {
                elements.serverStatus.textContent = 'Сервер работает';
                elements.serverStatus.style.color = 'var(--success-color)';
                elements.apiStatus.className = 'status-badge success';
                elements.apiStatus.innerHTML = '<i class="fas fa-check-circle"></i> API настроен';
            } else {
                throw new Error('Неверный статус');
            }

        } catch (error) {
            elements.serverStatus.textContent = 'Ошибка подключения';
            elements.serverStatus.style.color = 'var(--error-color)';
            elements.apiStatus.className = 'status-badge error';
            elements.apiStatus.innerHTML = '<i class="fas fa-times-circle"></i> API не настроен';
        }
    }

    // ======== ОБНОВЛЕНИЕ ВРЕМЕНИ ========
    function updateTime() {
        const now = new Date();
        elements.currentTime.textContent = now.toLocaleTimeString('ru-RU');
    }

    // ======== УПРАВЛЕНИЕ МОДАЛЬНЫМ ОКНОМ ========
    window.showSettings = function() {
        elements.settingsModal.classList.add('active');
        checkServerStatus();
        updateTime();
        setInterval(updateTime, 1000);
    };

    window.closeSettings = function() {
        elements.settingsModal.classList.remove('active');
    };

    // ======== НАВИГАЦИЯ ========
    window.scrollToChat = function() {
        const chatSection = document.getElementById('chat');
        const headerOffset = document.querySelector('.header').offsetHeight;
        const elementPosition = chatSection.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset - 20;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
        
        // Фокус на поле ввода
        setTimeout(() => {
            elements.chatInput.focus();
        }, 500);
    };

    window.scrollToFeatures = function() {
        const featuresSection = document.getElementById('features');
        const headerOffset = document.querySelector('.header').offsetHeight;
        const elementPosition = featuresSection.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset - 20;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    };

    window.showAbout = function() {
        const aboutSection = document.getElementById('about');
        const headerOffset = document.querySelector('.header').offsetHeight;
        const elementPosition = aboutSection.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset - 20;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    };

    // ======== ОБРАБОТКА НАЖАТИЯ КЛАВИШИ ========
    window.handleKeyDown = function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    // ======== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ========
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ======== СОХРАНЕНИЕ ИСТОРИИ ЧАТА ========
    function saveChatHistory() {
        try {
            localStorage.setItem('neuroai_chat_history', JSON.stringify(chatHistory));
            localStorage.setItem('neuroai_stats', JSON.stringify(stats));
        } catch (error) {
            console.warn('Не удалось сохранить историю чата:', error);
        }
    }

    // ======== ЗАГРУЗКА ИСТОРИИ ЧАТА ========
    function loadChatHistory() {
        try {
            const savedHistory = localStorage.getItem('neuroai_chat_history');
            const savedStats = localStorage.getItem('neuroai_stats');
            
            if (savedHistory) {
                chatHistory = JSON.parse(savedHistory);
                renderChatHistory();
            }
            
            if (savedStats) {
                stats = JSON.parse(savedStats);
                updateStats(null);
            }
        } catch (error) {
            console.warn('Не удалось загрузить историю чата:', error);
        }
    }

    // ======== ОТРИСОВКА ИСТОРИИ ЧАТА ========
    function renderChatHistory() {
        elements.chatHistory.innerHTML = '';
        
        chatHistory.forEach((message, index) => {
            if (index === 0 && message.role === 'ai') {
                // Пропускаем приветственное сообщение, если есть история
                return;
            }
            
            if (message.type === 'image') {
                addImageToChat(message.content, message.role);
            } else {
                addMessageToChat(message.content, message.role);
            }
        });
    }

    // ======== ИНИЦИАЛИЗАЦИЯ ========
    function init() {
        console.log('🚀 NeuroAI инициализируется...');
        
        // Загружаем модели
        loadModels();
        
        // Загружаем историю чата
        loadChatHistory();
        
        // Инициализируем статистику
        updateStats(null);
        
        // Добавляем обработчики событий
        elements.sendBtn.addEventListener('click', sendMessage);
        
        // Закрытие модального окна по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.settingsModal.classList.contains('active')) {
                closeSettings();
            }
        });

        // Эффект прокрутки для шапки
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                document.querySelector('.header').classList.add('scrolled');
            } else {
                document.querySelector('.header').classList.remove('scrolled');
            }
        });

        console.log('✅ NeuroAI готов к работе!');
    }

    // Запускаем инициализацию
    init();
});
