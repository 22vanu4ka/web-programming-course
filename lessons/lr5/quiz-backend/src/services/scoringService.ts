// Сервис для подсчёта баллов в квизах
export class ScoringService {
    /**
     * Подсчёт баллов за вопрос с множественным выбором (multiple select)
     * @param correctAnswers - массив правильных ответов (индексы)
     * @param studentAnswers - массив ответов студента
     * @returns итоговый балл (не меньше 0)
     */
    scoreMultipleSelect(correctAnswers: number[], studentAnswers: number[]): number {
        let score = 0;
        const remainingCorrect = [...correctAnswers]; // копия правильных ответов
      
        for (const ans of studentAnswers) {
          const index = remainingCorrect.indexOf(ans);
          if (index !== -1) {
            // Правильный ответ, который ещё не был выбран
            score += 1;
            remainingCorrect.splice(index, 1); // удаляем, чтобы не учитывать повторно
          } else {
            // Неправильный ответ (или повтор правильного)
            score -= 0.5;
          }
        }
        return Math.max(0, score);
      }
  
    /**
     * Подсчёт баллов за эссе
     * @param grades - массив оценок по критериям
     * @param rubric - массив максимальных баллов по тем же критериям
     * @returns сумма баллов (каждая оценка не превышает свой максимум)
     */
    scoreEssay(grades: number[], rubric: number[]): number {
      if (grades.length !== rubric.length) {
        throw new Error('Длины массивов grades и rubric должны совпадать');
      }
      let total = 0;
      for (let i = 0; i < grades.length; i++) {
        total += Math.min(grades[i], rubric[i]);
      }
      return total;
    }
  }
  
  export const scoringService = new ScoringService();