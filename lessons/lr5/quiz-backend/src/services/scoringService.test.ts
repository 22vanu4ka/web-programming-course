import { describe, it, expect } from 'vitest';
import { scoringService } from './scoringService.js';

describe('ScoringService', () => {
  describe('scoreMultipleSelect', () => {
    it('должен вернуть максимальный балл, если все ответы правильные', () => {
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

    it('должен корректно обрабатывать повторяющиеся ответы', () => {
      const correct = [1];
      const student = [1, 1];
      // Первый правильный (+1), второй — неправильный (повтор не считается правильным) -> -0.5
      expect(scoringService.scoreMultipleSelect(correct, student)).toBe(0.5);
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
  });
});