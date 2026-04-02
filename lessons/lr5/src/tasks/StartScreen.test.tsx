import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StartScreen } from './StartScreen';

describe('StartScreen', () => {
  it('renders title and start button', () => {   // Убедиться, что компонент отображает минимальный интерфейс
    render(
      <StartScreen
        theme="light"
        soundEnabled={true}
        toggleTheme={vi.fn()}
        onStart={vi.fn()}
      />
    );

    expect(screen.getByText('Quiz Game')).toBeInTheDocument();
    expect(screen.getByText('Начать игру')).toBeInTheDocument();
  });

  it('calls onStart when start button is clicked', () => {   // Проверить, что при клике на кнопку действительно вызывается колбэк, переданный через пропс
    const mockStart = vi.fn();

    render(
      <StartScreen
        theme="light"
        soundEnabled={true}
        toggleTheme={vi.fn()}
        onStart={mockStart}
      />
    );

    fireEvent.click(screen.getByText('Начать игру'));

    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('calls toggleTheme when theme button clicked', () => {   // Убедиться, что переключение темы работает
    const mockToggle = vi.fn();

    render(
      <StartScreen
        theme="light"
        soundEnabled={true}
        toggleTheme={mockToggle}
        onStart={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('🌙'));

    expect(mockToggle).toHaveBeenCalled();
  });
});
