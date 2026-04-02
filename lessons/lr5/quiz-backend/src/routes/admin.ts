import { Hono } from 'hono';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { adminMiddleware } from '../middleware/admin.js';
import { QuestionSchema, GradeSchema } from '../utils/validation.js';

export const admin = new Hono();

admin.use('*', adminMiddleware);

admin.get('/questions', async (c) => {
    try {
      const questions = await prisma.question.findMany({
        select: {
          id: true,
          text: true,
          type: true,
          categoryId: true,
          correctAnswer: true,
          points: true,
          category: { select: { name: true } },
          _count: { select: { answers: true } }
        }
      });
      return c.json({ questions });
    } catch (error) {
      console.error(error);
      return c.json({ error: 'Internal Server Error' }, 500);
    }
});

// POST /api/admin/questions – создать вопрос
admin.post('/questions', async (c) => {
  try {
    const body = await c.req.json();
    const data = QuestionSchema.parse(body);

    const createData: any = {
      text: data.text,
      type: data.type,
      categoryId: data.categoryId,
      points: data.points,
    };
    if (data.correctAnswer !== undefined) {
      createData.correctAnswer = data.correctAnswer as Prisma.InputJsonValue;
    }

    const question = await prisma.question.create({ data: createData });

    return c.json({ question }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.flatten() }, 400);
    }
    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// PUT /api/admin/questions/:id – обновить вопрос
admin.put('/questions/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const data = QuestionSchema.partial().parse(body);

    const updateData: any = {};
    if (data.text !== undefined) updateData.text = data.text;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.points !== undefined) updateData.points = data.points;
    if (data.correctAnswer !== undefined) {
      updateData.correctAnswer = data.correctAnswer as Prisma.InputJsonValue;
    }

    const question = await prisma.question.update({
      where: { id },
      data: updateData,
    });

    return c.json({ question });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.flatten() }, 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return c.json({ error: 'Question not found' }, 404);
    }
    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// GET /api/admin/answers/pending – непроверенные essay ответы с пагинацией
admin.get('/answers/pending', async (c) => {
    try {
      const page = parseInt(c.req.query('page') || '1');
      const limit = parseInt(c.req.query('limit') || '10');
      const skip = (page - 1) * limit;
  
      const where = {
        question: { type: 'essay' },
        score: null,
        isCorrect: null,
      };
  
      const [answers, total] = await prisma.$transaction([
        prisma.answer.findMany({
          where,
          skip,
          take: limit,
          include: {
            session: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              }
            },
            question: { select: { id: true, text: true, points: true } }
          },
          orderBy: { createdAt: 'asc' }
        }),
        prisma.answer.count({ where })
      ]);
  
      return c.json({
        answers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error(error);
      return c.json({ error: 'Internal Server Error' }, 500);
    }
});

// POST /api/admin/answers/:id/grade – оценить essay
admin.post('/answers/:id/grade', async (c) => {
  try {
    const answerId = c.req.param('id');
    const body = await c.req.json();
    const { grades } = GradeSchema.parse(body);

    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        question: true,
        session: { include: { answers: true } }
      }
    });

    if (!answer) {
      return c.json({ error: 'Answer not found' }, 404);
    }
    if (answer.question.type !== 'essay') {
      return c.json({ error: 'Answer is not an essay' }, 400);
    }

    const maxPoints = answer.question.points;
    const totalGrade = grades.reduce((sum, g) => sum + g, 0);
    const finalScore = Math.min(totalGrade, maxPoints);

    const updatedAnswer = await prisma.$transaction(async (tx) => {
      const ans = await tx.answer.update({
        where: { id: answerId },
        data: { score: finalScore, isCorrect: true },
      });

      const sessionId = answer.sessionId;
      const sessionAnswers = await tx.answer.findMany({
        where: {
          sessionId,
          question: { type: 'essay' }
        }
      });

      const allGraded = sessionAnswers.every(a => a.score !== null);
      if (allGraded) {
        const allAnswers = await tx.answer.findMany({ where: { sessionId } });
        const totalScore = allAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
        await tx.session.update({
          where: { id: sessionId },
          data: { score: totalScore }
        });
      }

      return ans;
    });

    return c.json({ answer: updatedAnswer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.flatten() }, 400);
    }
    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// GET /api/admin/students/:userId/stats – статистика студента
admin.get('/students/:userId/stats', async (c) => {
  try {
    const userId = c.req.param('userId');
    const sessions = await prisma.session.findMany({
      where: { userId, status: 'completed' },
      select: { score: true }
    });

    if (sessions.length === 0) {
      return c.json({ studentId: userId, averageScore: 0, totalSessions: 0 });
    }

    const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
    const averageScore = totalScore / sessions.length;

    return c.json({ studentId: userId, averageScore, totalSessions: sessions.length });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

admin.post('/questions/batch', async (c) => {
    try {
      const body = await c.req.json();
      const questionsData = z.array(QuestionSchema).parse(body);
      const result = await prisma.question.createMany({
        data: questionsData
      });
      return c.json({ count: result.count }, 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: error.flatten() }, 400);
      }
      console.error(error);
      return c.json({ error: 'Internal Server Error' }, 500);
    }
});