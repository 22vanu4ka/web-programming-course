import { Hono } from "hono";
import { verify } from "hono/jwt";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { SessionServiceError, sessionService } from "../services/sessionService.js";
import { AnswerSchema, SessionIdParamSchema } from "../utils/validation.js";

export const sessions = new Hono();

type JwtPayload = {
  sub: string;
};

class AuthError extends Error {
  constructor(
    message: "Unauthorized" | "Invalid token",
    public readonly statusCode: 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

async function verifyToken(authorization: string | undefined): Promise<JwtPayload> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthError("Unauthorized", 401);
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw new AuthError("Unauthorized", 401);
  }

  let payload: Awaited<ReturnType<typeof verify>>;
  try {
    payload = await verify(token, jwtSecret, "HS256");
  } catch {
    throw new AuthError("Invalid token", 401);
  }

  const userId = typeof payload.sub === "string" ? payload.sub : undefined;
  if (!userId) {
    throw new AuthError("Invalid token", 401);
  }

  return { sub: userId };
}

// POST /api/sessions – создание новой сессии
sessions.post('/', async (c) => {
  try {
    const authorization = c.req.header('Authorization');
    const { sub: userId } = await verifyToken(authorization);

    // Пытаемся прочитать тело, но допускаем его отсутствие
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      // тело пустое или не JSON – оставляем пустой объект
    }

    const { mode = 'standard', categoryId, limit } = body;

    // Вызываем сервис для создания сессии
    const sessionData = await sessionService.createSession(userId, { mode, categoryId, limit });

    return c.json(sessionData, 201);
  } catch (error) {
    if (error instanceof AuthError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    if (error instanceof SessionServiceError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    console.error('Error creating session:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// POST /api/sessions/:id/answers – отправка ответа на вопрос
sessions.post("/:id/answers", async (c) => {
  try {
    const authorization = c.req.header("Authorization");
    const { sub: userId } = await verifyToken(authorization);
    const { id } = SessionIdParamSchema.parse(c.req.param());

    // Проверяем принадлежность сессии и её существование
    const session = await prisma.session.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }
    if (session.userId !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const body = await c.req.json();
    const data = AnswerSchema.parse({
      ...body,
      sessionId: id, // добавляем sessionId для валидации (если нужно)
    });

    const answer = await sessionService.submitAnswer(id, data.questionId, data.userAnswer);
    return c.json({ answer }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.flatten() }, 400);
    }
    if (error instanceof AuthError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    if (error instanceof SessionServiceError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    console.error('Error submitting answer:', error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// GET /api/sessions/:id – получение данных сессии со всеми ответами
sessions.get("/:id", async (c) => {
  try {
    const authorization = c.req.header("Authorization");
    const { sub: userId } = await verifyToken(authorization);
    const { id } = SessionIdParamSchema.parse(c.req.param());

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }
    if (session.userId !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    return c.json({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.flatten() }, 400);
    }
    if (error instanceof AuthError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    console.error('Error fetching session:', error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// POST /api/sessions/:id/submit – завершение сессии и подсчёт итогового балла
sessions.post("/:id/submit", async (c) => {
  try {
    const authorization = c.req.header("Authorization");
    const { sub: userId } = await verifyToken(authorization);
    const { id } = SessionIdParamSchema.parse(c.req.param());

    const session = await prisma.session.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }
    if (session.userId !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const completedSession = await sessionService.submitSession(id);
    return c.json({ session: completedSession });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.flatten() }, 400);
    }
    if (error instanceof AuthError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    if (error instanceof SessionServiceError) {
      return c.json({ error: error.message }, error.statusCode);
    }
    console.error('Error submitting session:', error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});