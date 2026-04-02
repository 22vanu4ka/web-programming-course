import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Hono } from 'hono';
import auth from './auth.js';
import { sessions } from './sessions.js';
import { prisma } from '../lib/prisma.js';
import { clearDatabase } from '../tests/setup/test-db.js';
import { seedCategoryAndQuestion } from '../tests/setup/seed.js';

const app = new Hono();
app.route('/api/auth', auth);
app.route('/api/sessions', sessions);

describe('Sessions feature tests', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    await clearDatabase();
    // Создаём тестового пользователя через callback
    const authRes = await app.request(
      new Request('http://localhost/api/auth/github/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'test_code' }),
      })
    );
    const { token: newToken, user } = await authRes.json();
    token = newToken;
    userId = user.id;

    // Создаём категорию и вопрос (тестовые данные)
    await seedCategoryAndQuestion();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a session and return session data', async () => {
    const request = new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'standard' }),
    });
    const res = await app.request(request);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty('sessionId');
    expect(data.userId).toBe(userId);
    expect(data.status).toBe('in_progress');
    expect(data.questions.length).toBeGreaterThan(0);
  });

  it('should submit an answer and return answer object', async () => {
    // Создаём сессию
    const createRes = await app.request(
      new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    const { sessionId, questions } = await createRes.json();
    const questionId = questions[0].id;

    const answerRequest = new Request(`http://localhost/api/sessions/${sessionId}/answers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, userAnswer: ['0'] }),
    });
    const answerRes = await app.request(answerRequest);
    expect(answerRes.status).toBe(201);
    const answerData = await answerRes.json();
    expect(answerData.answer.questionId).toBe(questionId);
    expect(answerData.answer.score).toBeDefined();
  });

  it('should complete session and calculate score', async () => {
    const createRes = await app.request(
      new Request('http://localhost/api/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    const { sessionId, questions } = await createRes.json();
    const questionId = questions[0].id;

    // Отвечаем
    await app.request(
      new Request(`http://localhost/api/sessions/${sessionId}/answers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, userAnswer: ['0'] }),
      })
    );

    // Завершаем
    const submitRes = await app.request(
      new Request(`http://localhost/api/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(submitRes.status).toBe(200);
    const submitData = await submitRes.json();
    expect(submitData.session.status).toBe('completed');
    expect(submitData.session.score).toBeGreaterThan(0);
  });

  // Негативные тесты для сессий
it('should return 401 when no token provided for creating session', async () => {
  const request = new Request('http://localhost/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const res = await app.request(request);
  expect(res.status).toBe(401);
});

it('should return 401 when no token provided for submitting answer', async () => {
  const createRes = await app.request(
    new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  );
  const { sessionId, questions } = await createRes.json();
  const questionId = questions[0].id;

  const request = new Request(`http://localhost/api/sessions/${sessionId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, userAnswer: ['0'] }),
  });
  const res = await app.request(request);
  expect(res.status).toBe(401);
});

it('should return 401 for invalid token on session endpoint', async () => {
  const request = new Request('http://localhost/api/sessions', {
    method: 'POST',
    headers: { Authorization: 'Bearer invalid', 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const res = await app.request(request);
  expect(res.status).toBe(401);
});

it('should return 400 for invalid answer format (number instead of array)', async () => {
  const createRes = await app.request(
    new Request('http://localhost/api/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  );
  const { sessionId, questions } = await createRes.json();
  const questionId = questions[0].id;

  const request = new Request(`http://localhost/api/sessions/${sessionId}/answers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, userAnswer: 123 }),
  });
  const res = await app.request(request);
  expect(res.status).toBe(400);
});
});