import { PrismaClient } from '@prisma/client';

export const prismaTest = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'file:./test.db',
});

export async function clearDatabase() {
    await prismaTest.answer.deleteMany();
    await prismaTest.session.deleteMany();
    await prismaTest.question.deleteMany();
    await prismaTest.category.deleteMany();
    await prismaTest.user.deleteMany();
  }