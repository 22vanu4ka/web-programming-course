import pygame
import numpy as np
import random
import sys
from collections import defaultdict

# Инициализация PyGame
pygame.init()
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Обучение персонажа: бег за целью")
clock = pygame.time.Clock()

# Параметры среды
GRID_SIZE = 40  # размер клетки
PLAYER_COLOR = (0, 128, 255)
GOAL_COLOR = (255, 0, 0)
BG_COLOR = (30, 30, 30)
TEXT_COLOR = (255, 255, 255)

# Q-learning параметры
alpha = 0.1      # скорость обучения
gamma = 0.95     # дисконтирование
epsilon = 1.0    # вероятность случайного действия
epsilon_decay = 0.995
epsilon_min = 0.01

# Действия: 0=вверх, 1=вниз, 2=влево, 3=вправо
actions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

# Q-таблица
Q = defaultdict(lambda: np.zeros(len(actions)))

def get_state(player_pos, goal_pos):
    """Дискретизируем состояние для простоты"""
    px, py = player_pos
    gx, gy = goal_pos
    return (px // GRID_SIZE, py // GRID_SIZE, gx // GRID_SIZE, gy // GRID_SIZE)

def choose_action(state):
    global epsilon
    if random.random() < epsilon:
        return random.randint(0, 3)
    return np.argmax(Q[state])

def step(player_pos, action, goal_pos):
    """Выполняем шаг и возвращаем новое состояние и награду"""
    dx, dy = actions[action]
    new_x = max(0, min(WIDTH - GRID_SIZE, player_pos[0] + dx * GRID_SIZE))
    new_y = max(0, min(HEIGHT - GRID_SIZE, player_pos[1] + dy * GRID_SIZE))
    new_pos = (new_x, new_y)
    
    # Награда: +100 за достижение цели, -1 за каждый шаг
    distance = abs(new_x - goal_pos[0]) + abs(new_y - goal_pos[1])
    reward = -1
    done = False
    
    if distance < GRID_SIZE:
        reward = 100
        done = True
    
    return new_pos, reward, done

# Инициализация позиций
player_pos = (100, 100)
goal_pos = (WIDTH - 150, HEIGHT - 150)

# Обучение
episodes = 500
font = pygame.font.SysFont('Arial', 24)

print("Начинаю обучение... (окно можно закрыть досрочно)")
for episode in range(episodes):
    player_pos = (random.randint(0, WIDTH // GRID_SIZE - 1) * GRID_SIZE,
                  random.randint(0, HEIGHT // GRID_SIZE - 1) * GRID_SIZE)
    state = get_state(player_pos, goal_pos)
    total_reward = 0
    steps = 0
    done = False
    
    while not done and steps < 100:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
        
        action = choose_action(state)
        new_pos, reward, done = step(player_pos, action, goal_pos)
        new_state = get_state(new_pos, goal_pos)
        
        # Обновление Q-таблицы
        Q[state][action] = Q[state][action] + alpha * (
            reward + gamma * np.max(Q[new_state]) - Q[state][action]
        )
        
        player_pos = new_pos
        state = new_state
        total_reward += reward
        steps += 1
        
        # Отрисовка
        screen.fill(BG_COLOR)
        pygame.draw.rect(screen, GOAL_COLOR, (*goal_pos, GRID_SIZE, GRID_SIZE))
        pygame.draw.rect(screen, PLAYER_COLOR, (*player_pos, GRID_SIZE, GRID_SIZE))
        
        text1 = font.render(f"Эпизод: {episode+1}/{episodes}", True, TEXT_COLOR)
        text2 = font.render(f"Шагов: {steps}", True, TEXT_COLOR)
        text3 = font.render(f"epsilon: {epsilon:.3f}", True, TEXT_COLOR)
        screen.blit(text1, (20, 20))
        screen.blit(text2, (20, 50))
        screen.blit(text3, (20, 80))
        
        pygame.display.flip()
        clock.tick(60)  # можно увеличить для ускорения обучения
    
    if epsilon > epsilon_min:
        epsilon *= epsilon_decay

print("Обучение завершено! Демонстрация поведения...")
pygame.time.wait(1000)

# Демонстрация обученного агента
epsilon = 0  # только жадная стратегия
player_pos = (100, 100)
state = get_state(player_pos, goal_pos)
running = True

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_r:  # перезапуск по нажатию R
                player_pos = (100, 100)
                state = get_state(player_pos, goal_pos)
    
    action = choose_action(state)
    player_pos, _, done = step(player_pos, action, goal_pos)
    state = get_state(player_pos, goal_pos)
    
    # Отрисовка
    screen.fill(BG_COLOR)
    pygame.draw.rect(screen, GOAL_COLOR, (*goal_pos, GRID_SIZE, GRID_SIZE))
    pygame.draw.rect(screen, PLAYER_COLOR, (*player_pos, GRID_SIZE, GRID_SIZE))
    
    text = font.render("Обученный агент (нажмите R для перезапуска)", True, TEXT_COLOR)
    screen.blit(text, (20, 20))
    
    if done:
        win_text = font.render("ЦЕЛЬ ДОСТИГНУТА!", True, (0, 255, 0))
        screen.blit(win_text, (WIDTH//2 - 100, HEIGHT//2))
        pygame.display.flip()
        pygame.time.wait(1000)
        player_pos = (100, 100)
        state = get_state(player_pos, goal_pos)
    
    pygame.display.flip()
    clock.tick(10)  # замедлим для наглядности

pygame.quit()