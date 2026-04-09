import { FormEvent, useCallback, useEffect, useState } from 'react';

type ServerTodo = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

type QueueAction = {
  id: string;
  type: 'create' | 'toggle' | 'delete';
  payload: any;
  timestamp: number;
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function toLocalText(value: string) {
  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ru-RU');
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function apiFetchTodos(): Promise<ServerTodo[]> {
  const response = await fetch(`${API_BASE_URL}/api/todos`);
  const data = await parseJson<{ items: ServerTodo[] }>(response);
  return data.items;
}

async function apiCreate(title: string): Promise<ServerTodo> {
  const response = await fetch(`${API_BASE_URL}/api/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return parseJson<ServerTodo>(response);
}

async function apiToggle(todoId: number, done: boolean): Promise<ServerTodo> {
  const response = await fetch(`${API_BASE_URL}/api/todos/${todoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done }),
  });
  return parseJson<ServerTodo>(response);
}

async function apiDelete(todoId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/todos/${todoId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

function registerServiceWorkerStarter() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch((err) => console.error('SW registration failed:', err));
  }
}

export default function App() {
  const [todos, setTodos] = useState<ServerTodo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<QueueAction[]>([]);

  // Загрузка очереди из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('offline-queue');
    if (saved) {
      setOfflineQueue(JSON.parse(saved));
    }
  }, []);

  // Сохранение очереди в localStorage
  useEffect(() => {
    localStorage.setItem('offline-queue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  const refreshFromServer = useCallback(async () => {
    const serverTodos = await apiFetchTodos();
    setTodos(serverTodos);
  }, []);

  const addToQueue = (type: QueueAction['type'], payload: any) => {
    const action: QueueAction = {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: Date.now()
    };
    setOfflineQueue(prev => [...prev, action]);
  };

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || offlineQueue.length === 0) return;
    
    setMessage('Синхронизация...');
    
    for (const action of offlineQueue) {
      try {
        if (action.type === 'create') {
          await apiCreate(action.payload.title);
        } else if (action.type === 'toggle') {
          await apiToggle(action.payload.id, action.payload.done);
        } else if (action.type === 'delete') {
          await apiDelete(action.payload.id);
        }
      } catch (err) {
        console.error('Sync failed for action:', action);
        return;
      }
    }
    
    setOfflineQueue([]);
    await refreshFromServer();
    setMessage('Синхронизация завершена');
  }, [offlineQueue, refreshFromServer]);

  // Синхронизация при возвращении online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncQueue();
    }
  }, [isOnline, offlineQueue.length, syncQueue]);

  const onCreate = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      try {
        await apiCreate(trimmed);
        await refreshFromServer();
        setMessage('Задача добавлена.');
      } catch {
        addToQueue('create', { title: trimmed });
        setMessage('Сохранено в очередь (офлайн)');
      }
    },
    [refreshFromServer]
  );

  const onToggle = useCallback(
    async (todo: ServerTodo) => {
      try {
        await apiToggle(todo.id, !todo.done);
        await refreshFromServer();
        setMessage('Статус обновлен.');
      } catch {
        addToQueue('toggle', { id: todo.id, done: !todo.done });
        setMessage('Сохранено в очередь (офлайн)');
      }
    },
    [refreshFromServer]
  );

  const onDelete = useCallback(
    async (todo: ServerTodo) => {
      try {
        await apiDelete(todo.id);
        await refreshFromServer();
        setMessage('Задача удалена.');
      } catch {
        addToQueue('delete', { id: todo.id });
        setMessage('Сохранено в очередь (офлайн)');
      }
    },
    [refreshFromServer]
  );

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = inputValue;
      setInputValue('');
      await onCreate(value);
    },
    [inputValue, onCreate]
  );

  useEffect(() => {
    registerServiceWorkerStarter();

    let cancelled = false;

    const bootstrap = async () => {
      try {
        await refreshFromServer();
      } catch {
        if (!cancelled) {
          setMessage('Не удалось загрузить данные. Проверьте, что backend запущен.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [refreshFromServer]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setMessage('Соединение восстановлено');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setMessage('Нет соединения, работаем офлайн');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <main className="app">
      <header className="header">
        <h1>Todo-сы</h1>
        <span className={`badge ${isOnline ? 'online' : 'offline'}`}>{isOnline ? 'online' : 'offline'}</span>
      </header>

      <p className="muted">
        Есть: online CRUD. Реализовать: PWA, offline-очередь и синхронизацию после reconnect.
      </p>

      <form className="toolbar" onSubmit={onSubmit}>
        <input
          type="text"
          maxLength={200}
          placeholder="Новая задача"
          required
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
        />
        <button type="submit">Добавить</button>
        <button type="button" onClick={() => syncQueue()} disabled={!isOnline || offlineQueue.length === 0}>
          Синхронизация ({offlineQueue.length})
        </button>
      </form>

      <section className="meta">
        <span className="badge">Офлайн-очередь: {offlineQueue.length}</span>
        <span className="badge">sync: {isOnline ? 'auto' : 'offline'}</span>
      </section>

      <section className="todo-note">
        <p>
          TODO(PWA-4): реализуйте очередь операций и автоматическую отправку после события <code>online</code>.
        </p>
      </section>

      {message ? <div className="message">{message}</div> : null}
      {isLoading ? <p>Загрузка...</p> : null}
      {!isLoading && todos.length === 0 ? <div className="empty">Пока нет задач</div> : null}

      <ul className="list">
        {todos.map((todo) => (
          <li className="item" key={todo.id}>
            <button type="button" onClick={() => void onToggle(todo)}>
              {todo.done ? '✅' : '⬜'}
            </button>
            <div>
              <div className={todo.done ? 'done' : ''}>{todo.title}</div>
              <div className="hint">Сервер · {toLocalText(todo.updatedAt)}</div>
            </div>
            <button type="button" onClick={() => void onDelete(todo)}>
              Удалить
            </button>
            <span className="hint">#{todo.id}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}