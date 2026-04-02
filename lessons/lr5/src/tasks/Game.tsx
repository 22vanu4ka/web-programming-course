import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from '../stores/gameStore';

interface GameScreenProps {
  theme: string;
  toggleTheme: () => void;
  onNext: () => void;
}

export const GameScreen = observer(
  ({ theme, toggleTheme, onNext }: GameScreenProps) => {
    const {
      currentQuestion,
      selectedAnswers,
      essayAnswer,
      setEssayAnswer,
      selectAnswer,
      currentQuestionIndex,
      questions,
      isLastQuestion,
    } = gameStore;

    if (!currentQuestion) return null;

    const canProceed = () => {
      if (currentQuestion.type === 'essay') {
        return essayAnswer?.trim().length > 0;
      }
      return selectedAnswers.length > 0;
    };

    // Стили в зависимости от темы
    const bgGradient =
      theme === 'light'
        ? 'from-purple-500 to-indigo-600'
        : 'from-gray-900 to-black';
    const cardBg = theme === 'light' ? 'bg-white' : 'bg-gray-800';
    const textColor = theme === 'light' ? 'text-gray-800' : 'text-white';
    const buttonBg = theme === 'light' ? 'bg-purple-500' : 'bg-purple-500';
    const optionBg = theme === 'light' ? 'bg-gray-100' : 'bg-gray-700';

    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgGradient} p-4`}>
        <div className="max-w-2xl mx-auto">
          {/* Кнопка переключения темы */}
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>

          <div className={`${cardBg} rounded-2xl shadow-2xl p-8`}>
            <div className="mb-4 text-gray-600 dark:text-gray-300">
              Вопрос {currentQuestionIndex + 1} из {questions.length}
            </div>

            <h2 className={`text-2xl font-bold mb-6 ${textColor}`}>
              {currentQuestion.question}
            </h2>

            {currentQuestion.type === 'essay' ? (
              <textarea
                value={essayAnswer || ''}
                onChange={(e) => setEssayAnswer(e.target.value)}
                className={`w-full p-4 border rounded-lg ${optionBg} ${textColor}`}
              />
            ) : (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => selectAnswer(index)}
                    className={`w-full p-4 border rounded-lg text-left ${
                      selectedAnswers.includes(index)
                        ? 'bg-purple-200 dark:bg-purple-400 border-purple-500'
                        : `${optionBg} ${textColor}`
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {canProceed() && (
              <button
                onClick={onNext}
                className={`mt-6 w-full ${buttonBg} text-white py-3 rounded-lg font-semibold`}
              >
                {isLastQuestion ? 'Завершить' : 'Следующий вопрос'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);