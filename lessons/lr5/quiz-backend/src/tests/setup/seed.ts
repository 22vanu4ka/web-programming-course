import { prismaTest } from './test-db.js';

export async function seedCategoryAndQuestion() {
  const category = await prismaTest.category.create({
    data: {
      name: 'Test Category',
      slug: 'test-category',
    },
  });

  const question = await prismaTest.question.create({
    data: {
      text: 'Столица Франции?',
      type: 'multiple-select',
      categoryId: category.id,
      correctAnswer: ['0'],
      points: 5,
    },
  });

  return { category, question };
}