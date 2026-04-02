import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FinishScreen } from './FinishScreen';

describe('FinishScreen', () => {
  it('renders score and percentage', () => {   // Убедиться, что все итоговые данные корректно отображаются
    render(
      <FinishScreen
        theme="light"
        score={80}
        correctAnswers={4}
        totalQuestions={5}
        onRestart={vi.fn()}
      />
    );

    expect(screen.getByText('Игра завершена!')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText(/4\s*из\s*5/)).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('calls onRestart when restart button clicked', () => {   // Проверить, что при клике на кнопку рестарта вызывается соответствующий колбэк
    const mockRestart = vi.fn();

    render(
      <FinishScreen
        theme="light"
        score={50}
        correctAnswers={2}
        totalQuestions={5}
        onRestart={mockRestart}
      />
    );

    fireEvent.click(screen.getByText('Играть снова'));

    expect(mockRestart).toHaveBeenCalledTimes(1);
  });
});
