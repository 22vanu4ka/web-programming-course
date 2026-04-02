import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { githubCallbackSchema } from '../utils/validation.js'
import { prisma } from '../lib/prisma.js'
import { getGitHubUserByCode } from '../services/github.js'

const auth = new Hono()

// POST /api/auth/github/callback
auth.post('/github/callback', async (c) => {
  try {
    // Получение и валидация тела запроса
    const body = await c.req.json()
    console.log('📦 Request body:', body)

    const validation = githubCallbackSchema.safeParse(body)

    if (!validation.success) {
      return c.json({
        error: 'Validation failed',
        details: validation.error.issues
      }, 400)
    }

    const { code } = validation.data
    console.log('🔑 Processing code:', code)

    // Получаем пользователя из GitHub
    const githubUser = await getGitHubUserByCode(code)
    console.log('GitHub user:', githubUser)

    // Подготавливаем данные для БД
    const userData = {
      githubId: String(githubUser.id),
      name: githubUser.name ?? null,                    // name может быть null
      email: githubUser.email ?? `github-${githubUser.id}@example.com`, // заглушка, если email не предоставлен
    }

    // Сохраняем в базу данных (upsert)
    const user = await prisma.user.upsert({
      where: { githubId: userData.githubId },
      update: {
        name: userData.name,
        email: userData.email,
      },
      create: userData,
    })

    console.log('User saved:', user)

    // Создаем JWT токен
    const payload = {
      sub: user.id,
      githubId: user.githubId,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 дней
    }

    const secret = process.env.JWT_SECRET || 'dev-secret-key'
    const token = await sign(payload, secret)

    // Возвращаем ответ клиенту
    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        githubId: user.githubId
      }
    })

  } catch (error) {
    console.error('❌ Auth error:', error)
    // Если ошибка от GitHubServiceError – можно вернуть её статус и сообщение
    if (error instanceof Error && 'statusCode' in error) {
      const ghError = error as any // упрощённо
      return c.json({
        success: false,
        error: ghError.message
      }, ghError.statusCode || 500)
    }
    return c.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Эндпоинт GET /api/auth/me (без изменений)
auth.get('/me', async (c) => {
  try {
    // Проверка заголовка Authorization
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header'
      }, 401)
    }

    const token = authHeader.split(' ')[1]
    const secret = process.env.JWT_SECRET || 'dev-secret-key'
    // Проверка токена
    const payload = await verify(token, secret, 'HS256')

    // Поиск пользователя в БД
    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string }
    })

    if (!user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 404)
    }

    // Ответ
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        githubId: user.githubId
      }
    })

  // Обработка проверок ошибки токена  
  } catch (error) {
    return c.json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid token'
    }, 401)
  }
})

export default auth