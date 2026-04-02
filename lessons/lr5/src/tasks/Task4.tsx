import { observer } from 'mobx-react-lite';
import { gameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import * as React from 'react';

import { StartScreen } from './StartScreen';
import { FinishScreen } from './FinishScreen';
import { GameScreen } from './Game';

const Task4 = observer(() => {
  const { gameStatus, score, correctAnswersCount, questions } =
    gameStore;

  const theme = useUIStore((s) => s.theme);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const handleStart = async () => {
    try {
      // Используем моковые данные для демонстрации
      const { mockQuestions } = await import('../data/questions');
      gameStore.startGame(mockQuestions as any);
    } catch (error) {
      console.error('Ошибка загрузки вопросов:', error);
    }
  };
  
  const handleNext = () => {
    if (gameStore.isLastQuestion) {
      gameStore.finishGame(); // завершаем игру
    } else {
      gameStore.nextQuestion(); // переходим к следующему вопросу
    }
  };

  if (gameStatus === 'idle') {
    return (
      <StartScreen
        theme={theme}
        soundEnabled={soundEnabled}
        toggleTheme={toggleTheme}
        onStart={handleStart}
      />
    );
  }

  if (gameStatus === 'finished') {
    return (
      <FinishScreen
        theme={theme}
        score={score}
        correctAnswers={correctAnswersCount}
        totalQuestions={questions.length}
        onRestart={() => gameStore.resetGame()}
      />
    );
  }

  return (
    <GameScreen
      theme={theme}
      toggleTheme={toggleTheme}
      onNext={handleNext}
    />
  );
});

export default Task4;
