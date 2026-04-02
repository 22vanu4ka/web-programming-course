import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { scoringService } from './scoringService.js';

export class SessionServiceError extends Error {
  constructor(
    message:
      | "Session not found"
      | "Question not found"
      | "Session is not active"
      | "Session expired"
      | "Invalid answer format"
      | "Answer already submitted",
    public readonly statusCode: 400 | 404 | 409,
  ) {
    super(message);
    this.name = "SessionServiceError";
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export class SessionService {
  async submitAnswer(sessionId: string, questionId: string, userAnswer: string | string[]) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
      });

      //	Проверяет, что сессия существует, активна и не истекла
      if (!session) {
        throw new SessionServiceError("Session not found", 404);
      }

      if (session.status !== "in_progress") {
        throw new SessionServiceError("Session is not active", 409);
      }

      if (session.expiresAt < new Date()) {
        await tx.session.update({
          where: { id: sessionId },
          data: { status: "expired" },
        });
        throw new SessionServiceError("Session expired", 409);
      }

      // Проверяет, что вопрос существует
      const question = await tx.question.findUnique({
        where: { id: questionId },
      });

      if (!question) {
        throw new SessionServiceError("Question not found", 404);
      }

      let score: number | null = null;
      let isCorrect: boolean | null = null;

      if (question.type === "multiple-select") {
        if (!isStringArray(userAnswer)) {
          throw new SessionServiceError("Invalid answer format", 400);
        }
        if (!isStringArray(question.correctAnswer)) {
          throw new SessionServiceError("Invalid answer format", 400);
        }

        // Преобразуем строки в числа для подсчёта баллов
        const correctNumbers = question.correctAnswer.map(Number);
        const studentNumbers = userAnswer.map(Number);

        score = scoringService.scoreMultipleSelect(correctNumbers, studentNumbers);

        const correctSet = new Set(correctNumbers);
        const studentSet = new Set(studentNumbers);
        isCorrect =
          studentSet.size === correctSet.size &&
          Array.from(studentSet).every((answer) => correctSet.has(answer));
      }

      // Создаём запись Answer в транзакции
      try {
        return await tx.answer.create({
          data: {
            sessionId,
            questionId,
            userAnswer: userAnswer as Prisma.InputJsonValue,
            score,
            isCorrect,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new SessionServiceError("Answer already submitted", 409);
        }
        throw error;
      }
    });
  }

  async createSession(
    userId: string,
    options?: { categoryId?: string; limit?: number; mode?: string }
  ): Promise<{
    sessionId: string;
    userId: string;
    status: string;
    mode: string;
    questions: { id: string; text: string; type: string }[];
    totalQuestions: number;
    answeredCount: number;
    createdAt: Date;
  }> {
    return prisma.$transaction(async (tx) => {
      // Создаём сессию со сроком действия 1 час
      const session = await tx.session.create({
        data: {
          userId,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // +1 час
          status: 'in_progress',
        },
      });
  
      // Формируем условия для выборки вопросов
      const where: any = {};
      if (options?.categoryId) {
        where.categoryId = options.categoryId;
      }
  
      // Получаем все вопросы (или отфильтрованные по категории)
      const allQuestions = await tx.question.findMany({
        where,
        select: {
          id: true,
          text: true,
          type: true
        },
      });
  
      // Если указан limit, выбираем случайные вопросы в нужном количестве
      let selectedQuestions = allQuestions;
      if (options?.limit && options.limit > 0) {
        // Перемешиваем массив и берём первые limit элементов
        selectedQuestions = allQuestions
          .sort(() => 0.5 - Math.random())
          .slice(0, options.limit);
      }
  
      // Возвращаем объект, соответствующий SessionResponse
      return {
        sessionId: session.id,
        userId: session.userId,
        status: session.status,
        mode: options?.mode || 'standard',
        questions: selectedQuestions,
        totalQuestions: selectedQuestions.length,
        answeredCount: 0,
        createdAt: session.createdAt,
      };
    });
  }

  async submitSession(sessionId: string) {
    return prisma.$transaction(async (tx) => {
      // Проверяет, что сессия существует, активна и не истекла
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: {
          answers: true,
        },
      });

      if (!session) {
        throw new SessionServiceError("Session not found", 404);
      }

      if (session.status !== "in_progress") {
        throw new SessionServiceError("Session is not active", 409);
      }

      if (session.expiresAt < new Date()) {
        await tx.session.update({
          where: { id: sessionId },
          data: { status: "expired" },
        });
        throw new SessionServiceError("Session expired", 409);
      }

      // Суммирует баллы всех ответов
      const totalScore = session.answers
        .filter((answer) => answer.score !== null)
        .reduce((sum, answer) => sum + (answer.score ?? 0), 0);

      //	Обновляет статус сессии на completed, устанавливает score и completedAt
      return tx.session.update({
        where: { id: sessionId },
        data: {
          status: "completed",
          score: totalScore,
          completedAt: new Date(),
        },
        include: {
          answers: true,
        },
      });
    });
  }
}

export const sessionService = new SessionService();