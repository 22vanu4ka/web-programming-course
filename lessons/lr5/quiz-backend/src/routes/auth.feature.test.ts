import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import auth from './auth.js';
import { prisma } from '../lib/prisma.js';
import { clearDatabase } from '../tests/setup/test-db.js';

const app = new Hono();
app.route('/api/auth', auth);

describe('Auth feature tests', () => {
  beforeAll(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return token and user for test code', async () => {
    const request = new Request('http://localhost/api/auth/github/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'test_code' }),
    });
    const res = await app.request(request);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.user.githubId).toBe('123456');
  });

  it('should return 400 for missing code', async () => {
    const request = new Request('http://localhost/api/auth/github/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await app.request(request);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
  });

  it('should return user info for valid token', async () => {
    // Получаем токен
    const authRes = await app.request(
      new Request('http://localhost/api/auth/github/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'test_code' }),
      })
    );
    const { token } = await authRes.json();

    const meRequest = new Request('http://localhost/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meRes = await app.request(meRequest);
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData.success).toBe(true);
    expect(meData.user.email).toBe('testuser@example.com');
  });

  it('should return 401 for invalid token', async () => {
    const request = new Request('http://localhost/api/auth/me', {
      headers: { Authorization: 'Bearer invalid' },
    });
    const res = await app.request(request);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 401 when no token provided for /me', async () => {
    const request = new Request('http://localhost/api/auth/me');
    const res = await app.request(request);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });
});