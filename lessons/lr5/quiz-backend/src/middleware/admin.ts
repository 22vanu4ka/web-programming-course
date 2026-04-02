import { verify } from 'hono/jwt';
import { prisma } from '../lib/prisma.js';

// проверяет, что текущий пользователь аутентифицирован и имеет роль admin
export async function adminMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return c.json({ error: 'JWT_SECRET not configured' }, 500);
  }

  // проверка, что заголовок начинается с Bearer
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  let payload: any;
  try {
    payload = await verify(token, jwtSecret, 'HS256');
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const userId = payload.sub;
  if (!userId) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  });

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  c.set('userId', user.id);
  c.set('userRole', user.role);
  await next();
}