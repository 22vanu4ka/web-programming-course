import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import auth from './auth.js';
import { admin } from './admin.js';
import { prisma } from '../lib/prisma.js';
import { clearDatabase } from '../tests/setup/test-db.js';

const app = new Hono();
app.route('/api/auth', auth);
app.route('/api/admin', admin);

describe('Admin role-based restrictions', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    await clearDatabase();

    // Создаём обычного пользователя
    const userRes = await app.request(
      new Request('http://localhost/api/auth/github/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'test_code' }),
      })
    );
    const { token: userTok, user: userData } = await userRes.json();
    userToken = userTok;

    // Создаём второго пользователя и делаем его админом
    // Создаём администратора через отдельный код
    const adminUserRes = await app.request(
        new Request('http://localhost/api/auth/github/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'test_admin' }),
        })
    );
    const { token: adminTok, user: adminData } = await adminUserRes.json();
    await prisma.user.update({
        where: { id: adminData.id },
        data: { role: 'admin' },
    });
    adminToken = adminTok;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should allow admin to access admin endpoint', async () => {
    const request = new Request('http://localhost/api/admin/questions', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const res = await app.request(request);
    expect(res.status).toBe(200);
  });

  it('should deny access for non-admin user', async () => {
    const request = new Request('http://localhost/api/admin/questions', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const res = await app.request(request);
    expect(res.status).toBe(403);
  });

    it('should return 401 when no token provided for admin endpoint', async () => {
        const request = new Request('http://localhost/api/admin/questions');
        const res = await app.request(request);
        expect(res.status).toBe(401);
    });
    
    it('should return 400 for invalid question creation payload', async () => {
        const request = new Request('http://localhost/api/admin/questions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: '', type: 'invalid', categoryId: '' }),
        });
        const res = await app.request(request);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBeDefined();
    });

    it('should return 401 for invalid token on admin endpoint', async () => {
      const request = new Request('http://localhost/api/admin/questions', {
        headers: { Authorization: 'Bearer invalid' },
      });
      const res = await app.request(request);
      expect(res.status).toBe(401);
    });
});