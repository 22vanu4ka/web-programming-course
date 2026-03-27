# Backend API Development Guide - Полное руководство

Подробное руководство по разработке REST API на **Hono + Prisma + TypeScript**.

---

## Содержание

1. [Что такое Backend](#что-такое-backend)
2. [Архитектура REST API](#архитектура-rest-api)
3. [Hono Framework](#hono-framework)
4. [Prisma ORM](#prisma-orm)
5. [Валидация Zod](#валидация-zod)
6. [JWT Аутентификация](#jwt-аутентификация)
7. [Обработка ошибок](#обработка-ошибок)
8. [Best Practices](#best-practices)

---

## Что такое Backend

### Определение

**Backend** - это серверная часть приложения, которая:
- Обрабатывает HTTP запросы от клиентов
- Работает с базой данных
- Применяет бизнес-логику
- Возвращает JSON ответы

### Frontend vs Backend

```
Frontend (React)          Backend (Hono)
    ↓                          ↓
┌─────────────────────────────────────┐
│    HTTP запрос (GET /api/users)    │
├─────────────────────────────────────┤
│    Обработка на сервере             │
│    - Валидация                      │
│    - Проверка прав                  │
│    - Запрос в БД                    │
├─────────────────────────────────────┤
│    HTTP ответ (200 OK + JSON)       │
└─────────────────────────────────────┘
    ↑                          ↑
Frontend получает           Backend
JSON и обновляет UI        отправляет
```

### Зачем нужен Backend

1. **Безопасность**
   - Секреты (DB пароли, API ключи) на сервере
   - Клиент не может подделать данные
   - Контроль доступа (авторизация)

2. **Масштабируемость**
   - Кеширование на сервере
   - Обработка большого трафика
   - Распределение нагрузки

3. **Консистентность данных**
   - Единая база истины
   - Валидация на сервере
   - Транзакции в БД

4. **Логика**
   - Сложные вычисления
   - Работа с расписанием
   - Интеграции с внешними сервисами

---

## Архитектура REST API

### REST Принципы

**REST** (Representational State Transfer) - архитектурный стиль для веб-сервисов.

**Ключевые принципы:**

1. **Ресурсы** - любые сущности (users, posts, comments)
   ```
   /api/users          # Коллекция пользователей
   /api/users/:id      # Конкретный пользователь
   /api/posts/:id/comments  # Комментарии поста
   ```

2. **HTTP методы** - стандартные операции
   ```
   GET    /api/users       # Получить всех
   POST   /api/users       # Создать
   GET    /api/users/:id   # Получить одного
   PUT    /api/users/:id   # Обновить
   DELETE /api/users/:id   # Удалить
   ```

3. **Stateless** - сервер не хранит состояние
   - Каждый запрос самодостаточен
   - Для идентификации используются токены (JWT)

4. **JSON** - стандартный формат обмена
   ```json
   { "id": "123", "name": "Alice", "email": "alice@example.com" }
   ```

### HTTP Статус коды

```
2xx - Успех
  200 OK                  # Успешный запрос
  201 Created             # Ресурс создан
  204 No Content          # Успех без данных

4xx - Ошибка клиента
  400 Bad Request         # Некорректные данные
  401 Unauthorized        # Нет аутентификации
  403 Forbidden           # Нет прав доступа
  404 Not Found           # Ресурс не найден
  409 Conflict            # Конфликт (например, дубликат email)
  422 Unprocessable       # Ошибки валидации

5xx - Ошибка сервера
  500 Internal Error      # Неожиданная ошибка
  503 Service Unavailable # Сервис недоступен
```

### Структура API ответа

```typescript
// ✅ Успешный ответ
{
  status: 200,
  data: {
    id: "123",
    name: "Alice",
    email: "alice@example.com"
  }
}

// ❌ Ошибка валидации
{
  status: 400,
  error: "Validation failed",
  details: [
    { field: "email", message: "Invalid email format" },
    { field: "name", message: "Name is required" }
  ]
}

// ❌ Ошибка аутентификации
{
  status: 401,
  error: "Unauthorized",
  message: "Missing or invalid token"
}
```

---

## Hono Framework

### Что такое Hono

**Hono** - современный TypeScript-first фреймворк для Node.js и Workers.

**Преимущества:**
- Очень быстрый (оптимизированный маршрутизатор)
- Типизированный с TypeScript
- Небольшой размер (~25KB)
- Простой и интуитивный API
- Хорошо документирован

### Базовая структура

```typescript
import { Hono } from 'hono';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Routes
app.get('/api/users', async (c) => {
  const users = await db.findAll();
  return c.json({ users });
});

// Error handling
app.onError((err, c) => {
  return c.json({ error: err.message }, 500);
});

export default {
  port: 3000,
  fetch: app.fetch
};
```

### Контекст (Context)

Параметр `c` в обработчике - это **контекст запроса**.

```typescript
app.get('/api/users/:id', async (c) => {
  // c.req - объект запроса
  const id = c.req.param('id');           // Параметр маршрута
  const query = c.req.query('filter');    // Query параметр
  const body = await c.req.json();        // Body JSON
  const header = c.req.header('Authorization'); // Заголовок

  // c.set/c.get - хранилище данных (middleware → handler)
  c.set('userId', '123');
  const userId = c.get('userId');

  // c.json/c.text/c.html - отправить ответ
  return c.json({ data }, 200);
});
```

### Middleware

Middleware - это функции, которые выполняются для каждого запроса.

```typescript
// Встроенный middleware
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

app.use('*', cors());
app.use('*', logger());

// Кастомный middleware
app.use(async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`);
  const start = Date.now();

  await next(); // Передать управление дальше

  const duration = Date.now() - start;
  console.log(`Finished in ${duration}ms`);
});

// Conditional middleware
app.use('/api/protected/*', authMiddleware);

// Роутер с собственным middleware
const router = new Hono();
router.use(authMiddleware);
router.get('/me', (c) => c.json({ userId: c.get('userId') }));
app.route('/api', router);
```

---

## Prisma ORM

### Что такое ORM

**ORM** (Object-Relational Mapping) - инструмент для работы с БД через объекты.

```
                   БД (SQL)
                      ↑
                      ↓
         Prisma Client (TypeScript)
                      ↑
                      ↓
              Ваш код (JavaScript)
```

**Преимущества Prisma:**
- Type-safe запросы
- Auto-complete в IDE
- Миграции и версионирование
- Удобный синтаксис

### Schema файл

Файл `prisma/schema.prisma` описывает структуру БД.

```prisma
// Источник данных
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Генератор клиента
generator client {
  provider = "prisma-client-js"
}

// Модели (таблицы)
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String
  role      UserRole  @default(USER)
  createdAt DateTime  @default(now())

  posts     Post[]      // Связь один-ко-многим
  @@map("users")       // Имя таблицы в БД
}

enum UserRole {
  USER
  ADMIN
}

model Post {
  id        String    @id @default(cuid())
  title     String
  content   String
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())

  @@map("posts")
}
```

### CRUD операции

```typescript
import { prisma } from './db/client';

// CREATE
const user = await prisma.user.create({
  data: { email: 'alice@example.com', name: 'Alice' }
});

// READ one
const user = await prisma.user.findUnique({
  where: { id: '123' }
});

// READ many
const users = await prisma.user.findMany({
  where: { role: 'ADMIN' },
  orderBy: { createdAt: 'desc' },
  skip: 0,
  take: 10,
  select: { id: true, name: true, email: true } // Выбрать поля
});

// UPDATE
const user = await prisma.user.update({
  where: { id: '123' },
  data: { name: 'Alice Updated' }
});

// DELETE
await prisma.user.delete({
  where: { id: '123' }
});

// Связанные данные
const user = await prisma.user.findUnique({
  where: { id: '123' },
  include: { posts: true } // Загрузить посты пользователя
});
```

### Миграции

Миграции - это версионирование схемы БД.

```bash
# Создать миграцию после изменения schema.prisma
npx prisma migrate dev --name add_user_role

# Применить миграции в production
npx prisma migrate deploy

# Просмотреть БД визуально
npx prisma studio

# Сбросить БД (ТОЛЬКО для разработки!)
npx prisma migrate reset
```

---

## Валидация Zod

### Зачем нужна валидация

```typescript
// ❌ Без валидации
app.post('/api/users', async (c) => {
  const body = await c.req.json();
  // body может содержать что угодно!
  // { name: 123 } - не строка!
  // { email: null } - не email!
  const user = await prisma.user.create({ data: body });
});

// ✅ С валидацией
app.post('/api/users', async (c) => {
  const body = await c.req.json();
  const data = UserSchema.parse(body); // Проверяет тип и формат
  const user = await prisma.user.create({ data });
});
```

### Определение схем

```typescript
import { z } from 'zod';

// Простая схема
const UserSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Required').max(100),
  age: z.number().int().positive().optional()
});

// Сложная схема
const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(10),
  tags: z.array(z.string()).min(1).max(5),
  published: z.boolean().default(false),
  category: z.enum(['tech', 'life', 'other'])
});

// Трансформация данных
const TrimmedUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().trim()
});

// Извлечение TypeScript типа
type CreateUserInput = z.infer<typeof UserSchema>;
// Автоматически: { email: string, name: string, age?: number }
```

### Обработка ошибок

```typescript
try {
  const data = UserSchema.parse(body);
  // data типизирован как { email: string, name: string, age?: number }
} catch (error) {
  if (error instanceof z.ZodError) {
    // Ошибки валидации
    error.errors.forEach(e => {
      console.log(`Field: ${e.path}, Message: ${e.message}`);
    });
    return c.json({
      error: 'Validation failed',
      details: error.errors
    }, 400);
  }
}
```

---

## JWT Аутентификация

### Что такое JWT

**JWT** (JSON Web Token) - стандарт для передачи информации между сервером и клиентом.

**Структура токена:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VySWQiOiIxMjMiLCJyb2xlIjoiYWRtaW4ifQ.
TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ

Header.Payload.Signature
```

**Преимущества:**
- Stateless (не нужно хранить сессию на сервере)
- Безопасный (подписан)
- Стандартный (работает везде)
- Компактный (маленький размер)

### Генерация и проверка

```typescript
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

// Создать токен
function createToken(userId: string, role: string = 'user') {
  return jwt.sign(
    { userId, role },
    SECRET,
    { expiresIn: '7d' }
  );
}

// Проверить токен
function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    return null;
  }
}

// Использование
const token = createToken('user_123', 'admin');
const payload = verifyToken(token);
// payload = { userId: 'user_123', role: 'admin', iat: 1234, exp: 5678 }
```

### Middleware для аутентификации

```typescript
async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = verifyToken(token);

  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  // Сохранить в контексте для использования в обработчике
  c.set('userId', payload.userId);
  c.set('role', payload.role);

  await next();
}

// Использование
app.use('/api/protected/*', authMiddleware);

app.get('/api/protected/me', (c) => {
  const userId = c.get('userId');
  return c.json({ userId });
});
```

### Роль пользователя

```typescript
async function requireAdmin(c: Context, next: Next) {
  const role = c.get('role');

  if (role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await next();
}

app.use('/api/admin/*', authMiddleware, requireAdmin);

app.delete('/api/admin/users/:id', (c) => {
  // Только admin может удалять
  const id = c.req.param('id');
  return c.json({ deleted: id });
});
```

---

## Обработка ошибок

### Try-Catch паттерн

```typescript
app.post('/api/users', async (c) => {
  try {
    const body = await c.req.json();
    const data = UserSchema.parse(body);
    const user = await prisma.user.create({ data });
    return c.json(user, 201);
  } catch (error) {
    // Обработать ошибки по типам
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed' }, 400);
    }
    if (error instanceof Error && error.code === 'P2002') {
      return c.json({ error: 'Email already exists' }, 409);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});
```

### Глобальный обработчик

```typescript
app.onError((err, c) => {
  console.error(err);

  if (err instanceof z.ZodError) {
    return c.json({ error: 'Validation error' }, 400);
  }

  return c.json({
    error: 'Internal server error',
    message: err.message
  }, 500);
});
```

### Коды ошибок Prisma

```typescript
try {
  await prisma.user.delete({ where: { id } });
} catch (error: any) {
  if (error.code === 'P2025') {
    // Record not found
    return c.json({ error: 'User not found' }, 404);
  }
  if (error.code === 'P2002') {
    // Unique constraint violation
    return c.json({ error: 'Email already exists' }, 409);
  }
  if (error.code === 'P2003') {
    // Foreign key constraint failed
    return c.json({ error: 'Invalid reference' }, 400);
  }
}
```

---

## Best Practices

### 1. Структура проекта

```
backend/
├── src/
│   ├── handlers/           # Route handlers
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   └── posts.ts
│   ├── services/           # Бизнес-логика
│   │   ├── authService.ts
│   │   └── userService.ts
│   ├── middleware/         # Middleware функции
│   │   ├── auth.ts
│   │   └── validation.ts
│   ├── db/
│   │   └── client.ts       # Prisma клиент
│   ├── types/              # TypeScript типы
│   │   └── index.ts
│   └── index.ts            # Main app
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env
├── package.json
└── tsconfig.json
```

### 2. Разделение ответственности

```typescript
// ❌ Плохо - вся логика в обработчике
app.post('/api/users', async (c) => {
  const body = await c.req.json();
  const hashedPassword = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: { email: body.email, name: body.name, password: hashedPassword }
  });
  return c.json(user);
});

// ✅ Хорошо - логика в сервис
async function createUser(data: CreateUserInput) {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: { email: data.email, name: data.name, password: hashedPassword }
  });
}

app.post('/api/users', async (c) => {
  const body = await c.req.json();
  const data = CreateUserSchema.parse(body);
  const user = await createUser(data);
  return c.json(user, 201);
});
```

### 3. Консистентные ответы

```typescript
// ✅ Структурированные ответы
const sendSuccess = (c: Context, data: any, status = 200) => {
  return c.json({ success: true, data }, status);
};

const sendError = (c: Context, message: string, status = 400) => {
  return c.json({ success: false, error: message }, status);
};

// Использование
app.post('/api/users', async (c) => {
  try {
    const user = await createUser(data);
    return sendSuccess(c, user, 201);
  } catch (error) {
    return sendError(c, 'Failed to create user', 500);
  }
});
```

### 4. Логирование

```typescript
import { logger } from 'hono/logger';

app.use('*', logger());

// Или кастомное логирование
app.use(async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  console.log({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
});
```

### 5. CORS для разработки

```typescript
import { cors } from 'hono/cors';

app.use('*', cors({
  origin: 'http://localhost:5173', // URL фронтенда
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Полезные команды

```bash
# Инициализация
npm init -y
npm install hono @prisma/client zod jsonwebtoken dotenv
npm install -D typescript @types/node tsx @types/jsonwebtoken prisma

# Разработка
npm run dev                    # Запустить с hot reload

# Prisma
npx prisma init               # Инициализировать Prisma
npx prisma migrate dev        # Создать и применить миграцию
npx prisma studio            # Открыть визуальный редактор БД
npx prisma generate          # Пересгенерировать клиент

# Продакшн
npm run build                 # Собрать проект
npm start                     # Запустить продакшн
```

---

## Дополнительные ресурсы

- [Hono документация](https://hono.dev)
- [Prisma документация](https://www.prisma.io/docs)
- [Zod документация](https://zod.dev)
- [JWT.io](https://jwt.io)
- [REST API Best Practices](https://restfulapi.net)
- [HTTP Status Codes](https://httpwg.org/specs/rfc9110.html#status.codes)
