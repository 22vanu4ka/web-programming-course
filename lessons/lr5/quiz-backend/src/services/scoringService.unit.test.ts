import { describe, it, expect } from 'vitest';
import { scoringService } from './scoringService.js';

describe('ScoringService', () => {
  describe('scoreMultipleSelect', () => {
    it('должен вернуть максимальный балл, если все ответы правильные и уникальные', () => {
      const correct = [1, 2, 3];
      const student = [1, 2, 3];
      expect(scoringService.scoreMultipleSelect(correct, student)).toBe(3);
    });

    it('должен учитывать штраф за неправильные ответы', () => {
      const correct = [1, 2];
      const student = [1, 3];
      expect(scoringService.scoreMultipleSelect(correct, student)).toBe(1 - 0.5); // 0.5
    });

    it('не должен опускаться ниже 0', () => {
      const correct = [1];
      const student = [2, 3];
      expect(scoringService.scoreMultipleSelect(correct, student)).toBe(0);
    });

    it('должен корректно обрабатывать пустой массив ответов студента', () => {
      const correct = [1, 2];
      const student: number[] = [];
      expect(scoringService.scoreMultipleSelect(correct, student)).toBe(0);
    });

    it('должен корректно обрабатывать повторяющиеся ответы (дубликаты)', () => {
      const correct = [1];
      const student = [1, 1];
      // Первый правильный (+1), второй – неправильный (повтор) → -0.5
      expect(scoringService.scoreMultipleSelect(correct, student)).toBe(0.5);
    });

    it('должен корректно работать, когда правильный ответ – несколько вариантов', () => {
      const correct = [1, 3];
      const student = [1, 3, 5];
      expect(scoringService.scoreMultipleSelect(correct, student)).toBe(2 - 0.5); // 1.5
    });

    it('должен возвращать 0, если все ответы неправильные', () => {
      const correct = [1, 2];
      const student = [3, 4];
      expect(scoringService.scoreMultipleSelect(correct, student)).toBe(0);
    });
  });

  describe('scoreEssay', () => {
    it('должен суммировать оценки в пределах рубрики', () => {
      const grades = [3, 4, 5];
      const rubric = [5, 5, 5];
      expect(scoringService.scoreEssay(grades, rubric)).toBe(12);
    });

    it('должен ограничивать каждую оценку максимумом рубрики', () => {
      const grades = [6, 4, 7];
      const rubric = [5, 5, 5];
      expect(scoringService.scoreEssay(grades, rubric)).toBe(5 + 4 + 5); // 14
    });

    it('должен выбрасывать ошибку при разной длине массивов', () => {
      const grades = [3, 4];
      const rubric = [5, 5, 5];
      expect(() => scoringService.scoreEssay(grades, rubric)).toThrowError(
        'Длины массивов grades и rubric должны совпадать'
      );
    });

    it('должен корректно работать с нулевыми оценками', () => {
      const grades = [0, 0, 0];
      const rubric = [5, 5, 5];
      expect(scoringService.scoreEssay(grades, rubric)).toBe(0);
    });

    it('должен правильно считать, если оценки в точности равны максимуму', () => {
      const grades = [5, 5, 5];
      const rubric = [5, 5, 5];
      expect(scoringService.scoreEssay(grades, rubric)).toBe(15);
    });

    it('должен корректно обрабатывать, когда одна из оценок превышает максимум', () => {
      const grades = [10, 2];
      const rubric = [5, 3];
      expect(scoringService.scoreEssay(grades, rubric)).toBe(5 + 2); // 7
    });
  });
});