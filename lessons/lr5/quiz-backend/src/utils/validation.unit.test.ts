import { describe, it, expect } from 'vitest';
import {
  githubCallbackSchema,
  SessionIdParamSchema,
  AnswerSchema,
  GradeSchema,
  QuestionSchema,
} from './validation.js';

describe('Validation schemas', () => {
  describe('githubCallbackSchema', () => {
    it('должен успешно валидировать корректный объект', () => {
      const valid = { code: 'test_code' };
      expect(() => githubCallbackSchema.parse(valid)).not.toThrow();
    });

    it('должен отклонять объект без code', () => {
      const invalid = {};
      expect(() => githubCallbackSchema.parse(invalid)).toThrow();
    });

    it('должен отклонять пустую строку code', () => {
      const invalid = { code: '' };
      expect(() => githubCallbackSchema.parse(invalid)).toThrow();
    });
  });

  describe('SessionIdParamSchema', () => {
    it('должен успешно валидировать непустой id', () => {
      const valid = { id: 'session_123' };
      expect(() => SessionIdParamSchema.parse(valid)).not.toThrow();
    });

    it('должен отклонять пустой id', () => {
      const invalid = { id: '' };
      expect(() => SessionIdParamSchema.parse(invalid)).toThrow();
    });

    it('должен отклонять отсутствие id', () => {
      const invalid = {};
      expect(() => SessionIdParamSchema.parse(invalid)).toThrow();
    });
  });

  describe('AnswerSchema', () => {
    it('должен успешно валидировать объект с questionId и userAnswer (массив)', () => {
      const valid = { questionId: 'q1', userAnswer: ['0'] };
      expect(() => AnswerSchema.parse(valid)).not.toThrow();
    });

    it('должен успешно валидировать объект с userAnswer (строка)', () => {
      const valid = { questionId: 'q1', userAnswer: 'text' };
      expect(() => AnswerSchema.parse(valid)).not.toThrow();
    });

    it('должен отклонять объект без questionId', () => {
      const invalid = { userAnswer: ['0'] };
      expect(() => AnswerSchema.parse(invalid)).toThrow();
    });

    it('должен отклонять объект без userAnswer', () => {
      const invalid = { questionId: 'q1' };
      expect(() => AnswerSchema.parse(invalid)).toThrow();
    });

    it('должен отклонять userAnswer не строку и не массив', () => {
      const invalid = { questionId: 'q1', userAnswer: 123 };
      expect(() => AnswerSchema.parse(invalid)).toThrow();
    });
  });

  describe('GradeSchema', () => {
    it('должен успешно валидировать объект с answerId и grades (массив чисел)', () => {
      const valid = { answerId: 'a1', grades: [4, 5] };
      expect(() => GradeSchema.parse(valid)).not.toThrow();
    });

    it('должен отклонять пустой массив grades', () => {
      const invalid = { answerId: 'a1', grades: [] };
      expect(() => GradeSchema.parse(invalid)).toThrow();
    });

    it('должен отклонять отсутствие answerId', () => {
      const invalid = { grades: [4] };
      expect(() => GradeSchema.parse(invalid)).toThrow();
    });

    it('должен отклонять grades не массив чисел', () => {
      const invalid = { answerId: 'a1', grades: ['4', '5'] };
      expect(() => GradeSchema.parse(invalid)).toThrow();
    });
  });

  describe('QuestionSchema', () => {
    it('должен успешно валидировать корректный объект (с correctAnswer)', () => {
      const valid = {
        text: 'Столица Франции?',
        type: 'multiple-select',
        categoryId: 'cat1',
        correctAnswer: ['0'],
        points: 5,
      };
      expect(() => QuestionSchema.parse(valid)).not.toThrow();
    });

    it('должен успешно валидировать без correctAnswer и points (использует значения по умолчанию)', () => {
      const valid = {
        text: 'Эссе',
        type: 'essay',
        categoryId: 'cat2',
      };
      expect(() => QuestionSchema.parse(valid)).not.toThrow();
    });

    it('должен отклонять отсутствие text', () => {
      const invalid = { type: 'essay', categoryId: 'cat' };
      expect(() => QuestionSchema.parse(invalid)).toThrow();
    });

    it('должен отклонять неверный type', () => {
      const invalid = {
        text: 'Вопрос',
        type: 'invalid-type',
        categoryId: 'cat',
      };
      expect(() => QuestionSchema.parse(invalid)).toThrow();
    });

    it('должен отклонять отсутствие categoryId', () => {
      const invalid = { text: 'Вопрос', type: 'essay' };
      expect(() => QuestionSchema.parse(invalid)).toThrow();
    });

    it('должен устанавливать points = 1 по умолчанию', () => {
      const valid = { text: 'Вопрос', type: 'essay', categoryId: 'cat' };
      const result = QuestionSchema.parse(valid);
      expect(result.points).toBe(1);
    });
  });
});