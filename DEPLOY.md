# 🚀 Деплой NeuroAI на Vercel

## Подготовка к деплою

### 1. Установите Vercel CLI
```bash
npm i -g vercel
```

### 2. Войдите в Vercel
```bash
vercel login
```

### 3. Настройте переменные окружения
Перейдите в настройки проекта на Vercel и добавьте переменную:
- **OPENROUTER_API_KEY** — ваш API ключ от OpenRouter

## Деплой

### Вариант 1: Через Vercel CLI
```bash
# В корне проекта
vercel
```

Следуйте инструкциям:
1. Выберите "Create new project"
2. Введите имя проекта
3. Выберите организацию
4. Vercel автоматически определит, что это Node.js проект
5. Добавьте переменную окружения OPENROUTER_API_KEY

### Вариант 2: Через Vercel Dashboard
1. Перейдите на [vercel.com](https://vercel.com)
2. Нажмите "Add New" → "Project"
3. Импортируйте репозиторий GitHub/GitLab/Bitbucket
4. Vercel автоматически определит настройки
5. Добавьте переменную окружения OPENROUTER_API_KEY
6. Нажмите "Deploy"

## Конфигурация Vercel

Файл `vercel.json` уже настроен для:
- **API Routes** — все запросы к `/api/*` перенаправляются на `server.js`
- **Static Files** — `index.html` отображается как главная страница
- **Environment Variables** — `OPENROUTER_API_KEY` из Vercel Dashboard

## Проверка деплоя

После деплоя проверьте:
1. **Health Check** — `https://your-project.vercel.app/health`
2. **API Models** — `https://your-project.vercel.app/api/models`
3. **Frontend** — `https://your-project.vercel.app/`

## Важные замечания

### Безопасность
- **API ключ** хранится на сервере Vercel и не передается в браузер
- **CORS** настроен для безопасного взаимодействия
- **Environment Variables** защищены Vercel

### Производительность
- **Cold Start** — первый запрос может быть медленнее
- **Cache** — Vercel автоматически кэширует статические файлы
- **Edge Network** — быстрая доступность по всему миру

### Ограничения
- **Бесплатный план** — 100 ГБ трафика в месяц
- **Serverless Functions** — максимум 10 секунд выполнения
- **API Calls** — ограничения зависят от плана Vercel

## Отладка

### Логи Vercel
```bash
vercel logs your-project.vercel.app
```

### Проверка переменных
```bash
vercel env ls
```

### Удаление проекта
```bash
vercel rm your-project
```

## Альтернативные варианты

### Если нужен статический хостинг
1. Удалите `server.js` из `vercel.json`
2. Перенесите логику на клиентскую сторону
3. Используйте Vercel Edge Functions

### Если нужен постоянный сервер
1. Используйте Vercel с Node.js runtime
2. Настройте `vercel.json` для серверного рендеринга
3. Добавьте базу данных для хранения истории

## Чеклист перед деплоем

- [ ] API ключ добавлен в Vercel Dashboard
- [ ] `vercel.json` настроен правильно
- [ ] `.gitignore` исключает `.env` и `node_modules`
- [ ] `package.json` содержит все зависимости
- [ ] Тестовый запрос к API работает локально
- [ ] Frontend отображается корректно

## После деплоя

1. **Сохраните URL** вашего проекта
2. **Проверьте все эндпоинты** работают
3. **Протестируйте чат** с реальным запросом
4. **Сообщите пользователям** о новом URL

## Удаление проекта

Если нужно удалить проект:
```bash
vercel rm your-project-name
```

Или через Dashboard:
1. Перейдите в проект
2. Settings → Danger Zone → Delete Project

---

**Готово!** Ваш проект NeuroAI готов к деплою на Vercel.