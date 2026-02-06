// server.js - Бэкенд для нейросети с OpenRouter API
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = global.fetch || require('node-fetch');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Конфигурация API
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Проверка API ключа
if (!OPENROUTER_API_KEY) {
    console.error('❌ ОШИБКА: API-ключ OpenRouter не установлен!');
    console.error('Добавьте OPENROUTER_API_KEY в файл .env');
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Основной эндпоинт для генерации
app.post('/api/generate', async (req, res) => {
    const { type, prompt, model = 'mistralai/mistral-small-creative', temperature = 0.7, maxTokens = 500 } = req.body;

    if (!prompt) {
        return res.status(400).json({ 
            success: false,
            message: 'Отсутствует запрос (prompt).' 
        });
    }

    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({ 
            success: false,
            message: 'API-токен OpenRouter не настроен на сервере.' 
        });
    }

    try {
        let result;
        let apiUrl = OPENROUTER_API_URL;
        let headers = {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json; charset=utf-8',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Your Neural Network'
        };

        if (type === 'text') {
            // Генерация текста через OpenRouter
            const body = JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'Ты полезный ассистент, который отвечает на русском языке. Будь вежливым, информативным и профессиональным.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: temperature,
                max_tokens: maxTokens,
                stream: false
            });

            const response = await fetch(apiUrl, {
                headers: headers,
                method: 'POST',
                body: body,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка OpenRouter API: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(`Ошибка API: ${data.error.message}`);
            }

            result = data.choices?.[0]?.message?.content || 'Не удалось сгенерировать ответ.';
            
            res.json({ 
                success: true,
                generatedText: result,
                model: data.model,
                usage: data.usage
            });

        } else if (type === 'image') {
            // Для генерации изображений используем модель Stable Diffusion через OpenRouter
            // OpenRouter поддерживает модели для генерации изображений
            const body = JSON.stringify({
                model: 'stabilityai/stable-diffusion-xl-base-1.0',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 100
            });

            const response = await fetch(apiUrl, {
                headers: headers,
                method: 'POST',
                body: body,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка OpenRouter API (изображение): ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(`Ошибка API: ${data.error.message}`);
            }

            // OpenRouter может возвращать URL изображения или base64
            // В зависимости от модели
            if (data.choices?.[0]?.message?.content) {
                result = data.choices[0].message.content;
            } else {
                result = 'Изображение не получено. Попробуйте другой запрос.';
            }

            res.json({ 
                success: true,
                imageUrl: result,
                model: data.model,
                usage: data.usage
            });

        } else {
            res.status(400).json({ 
                success: false,
                message: 'Неизвестный тип запроса.' 
            });
        }
    } catch (error) {
        console.error('❌ Ошибка в бэкенде:', error);
        res.status(500).json({ 
            success: false,
            message: `Ошибка сервера: ${error.message}` 
        });
    }
});

// Эндпоинт для получения доступных моделей
app.get('/api/models', async (req, res) => {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json; charset=utf-8',
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка при получении моделей: ${response.status}`);
        }

        const data = await response.json();
        
        // Фильтруем только текстовые модели для простоты
        const textModels = data.data.filter(model =>
            !model.id.includes('image') &&
            !model.id.includes('vision') &&
            (
                model.id.includes('gpt') ||
                model.id.includes('claude') ||
                model.id.includes('llama') ||
                model.id.includes('mistral')
            )
        ).slice(0, 10); // Ограничиваем количество моделей

        res.json({ 
            success: true,
            models: textModels 
        });
    } catch (error) {
        console.error('❌ Ошибка при получении моделей:', error);
        res.status(500).json({ 
            success: false,
            message: `Ошибка при получении моделей: ${error.message}` 
        });
    }
});

// Эндпоинт для чата с историей
app.post('/api/chat', async (req, res) => {
    const { messages, model = 'mistralai/mistral-small-creative', temperature = 0.7, max_tokens = 500 } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ 
            success: false,
            message: 'Отсутствует история чата (messages).' 
        });
    }

    try {
        const body = JSON.stringify({
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: max_tokens || 500,
            stream: false
        });

        const response = await fetch(OPENROUTER_API_URL, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json; charset=utf-8',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Your Neural Network'
            },
            method: 'POST',
            body: body,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка OpenRouter API: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Ошибка API: ${data.error.message}`);
        }

        const reply = data.choices?.[0]?.message?.content || 'Не удалось получить ответ.';

        res.json({ 
            success: true,
            reply: reply,
            model: data.model,
            usage: data.usage
        });
    } catch (error) {
        console.error('❌ Ошибка в чате:', error);
        res.status(500).json({ 
            success: false,
            message: `Ошибка сервера: ${error.message}` 
        });
    }
});

// Health check эндпоинт
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        apiConfigured: !!OPENROUTER_API_KEY
    });
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'Эндпоинт не найден.' 
    });
});

// Запуск сервера
app.listen(port, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🚀 НЕЙРОСЕТЬ ЗАПУЩЕНА УСПЕШНО!                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📍 Сервер запущен на: http://localhost:${port}`);
    console.log(`🔐 API ключ: ${OPENROUTER_API_KEY ? '✓ Настроен' : '✗ Не настроен'}`);
    console.log('');
    console.log('📋 Доступные эндпоинты:');
    console.log(`   POST /api/generate - Генерация текста/изображений`);
    console.log(`   POST /api/chat     - Чат с историей`);
    console.log(`   GET  /api/models   - Список доступных моделей`);
    console.log(`   GET  /health       - Проверка состояния сервера`);
    console.log('');
    console.log('💡 Откройте index.html в браузере для использования интерфейса');
    console.log('');
});
