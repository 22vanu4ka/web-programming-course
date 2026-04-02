import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameScreen } from './Game';

// Мокаем MobX store полностью
vi.mock('../stores/gameStore', () => ({
  gameStore: {
    selectAnswer: vi.fn(),
    setEssayAnswer: vi.fn(),
    currentQuestion: { 
      id: '1',
      type: 'single',
      question: 'Test question?',
      options: ['A', 'B', 'C'],
      difficulty: 'easy',
      correctAnswer: 0
    },
    selectedAnswers: [],
    essayAnswer: '',
    score: 0,
    progress: 50,
    currentQuestionIndex: 0,
    questions: [{}, {}],
    isLastQuestion: false,
    correctAnswersCount: 0
  }
}));


import { gameStore } from '../stores/gameStore';

describe('GameScreen', () => {
  const mockNext = vi.fn();

  beforeEach(() => {    // перед каждым тестом очищаем все моки
    vi.clearAllMocks();
  });

  it('renders question text', () => {   // проверяет, что текст вопроса отображается
    render(<GameScreen theme="light" toggleTheme={vi.fn()} onNext={mockNext} />);
    expect(screen.getByText('Test question?')).toBeInTheDocument();
  });

  it('renders answer options', () => {   // Проверяет, что все три варианта ответа присутствуют на экране
    render(<GameScreen theme="light" toggleTheme={vi.fn()} onNext={mockNext} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('calls selectAnswer when option clicked', () => {   // Убедиться, что при выборе ответа вызывается правильный метод стора с правильным индексом
    render(<GameScreen theme="light" toggleTheme={vi.fn()} onNext={mockNext} />);
    fireEvent.click(screen.getByText('A'));
    expect(gameStore.selectAnswer).toHaveBeenCalledWith(0);   // проверка, что вызов произошёл с конкретным аргументом
  });
});
