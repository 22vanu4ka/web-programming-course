import { observer } from 'mobx-react-lite';
import { gameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import * as React from 'react';

import { StartScreen } from './StartScreen';
import { FinishScreen } from './FinishScreen';
import { GameScreen } from './Game';
import { usePostApiSessions } from '../../generated/api/sessions/sessions';


const Task4 = observer(() => {

  const theme = useUIStore((s) => s.theme);
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const createSession = usePostApiSessions();
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const { 
      gameStatus, 
      currentQuestion,
      selectedAnswers, 
      essayAnswer,
      score, 
      //progress,
      //123,
      questions,
      correctAnswersCount,
      //currentQuestionIndex,
      //isLastQuestion,
      //setEssayAnswer,
    } = gameStore;

  const handleStart = () => {
      createSession.mutate(
        {
          data: {
            questionCount: 5,
            difficulty: 'medium'
          }
        },
        {
          onSuccess: (response) => {
            setSessionId(response.sessionId);
            // Загружаем вопросы в gameStore
            gameStore.startGame(response.questions);
          },
          onError: (error) => {
            console.error('Failed to create session:', error);
          },
        }
      );
    };

  const handleNext = () => {
    if (sessionId && currentQuestion) {
      // Определяем тип вопроса и формируем данные для отправки
      let answerData;
      
      if (currentQuestion.type === 'essay') {
        // Для эссе отправляем текстовый ответ
        answerData = {
          questionId: currentQuestion.id as never as string,
          text: essayAnswer || '' // Добавляем проверку на null/undefined
        };
      } else {
        // Для вопросов с выбором отправляем выбранные варианты
        answerData = {
          questionId: currentQuestion.id as never as string,
          selectedOptions: selectedAnswers
        };
      }
  
      // Отправляем ответ на сервер
      submitAnswer.mutate(
        {
          sessionId,
          data: answerData
        },
        {
          onSuccess: (response) => {
            // Обновляем счет на основе ответа сервера
            if ('pointsEarned' in response) {
              // const isCorrect = response.status === 'correct';
              // ... обновляем результат ...
            }
            // Переходим к следующему вопросу
            if (!gameStore.nextQuestion()) {
              handleFinishGame();
            };
          },
          onError: (error) => {
            console.error('Failed to submit answer:', error);
            gameStore.nextQuestion();
          },
        }
      );
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
