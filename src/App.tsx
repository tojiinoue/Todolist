import { useState, useEffect, useRef } from 'react';
interface Todo {
  text: string;
  completed: boolean;
  dueDate: string;
}
//useState：今の状態を覚えておく変数とそれを更新する関数をセットでくれるReactの仕組み
//useEffect：何か処理を実行したいときに使う
//useRef：stateとは別に再描画させたくないけど値を保持したいときに使う
//interface Todo {...}：TypeScriptの型定義

function App() {
  const [newTodo, setNewTodo] = useState<string>('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const hasLoaded = useRef(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [newDueDate, setNewDewDate] = useState<string>('');

  function handleAddTodo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newTodo.trim()) return;
    const newTask: Todo = {
      text: newTodo.trim(),
      completed: false,
      dueDate: newDueDate
    };

    setTodos([...todos, newTask]);
    setNewTodo('');
  }

  function handleToggleTodo(index: number) {
    const newTodos = [...todos];
    newTodos[index].completed = !newTodos[index].completed;
    setTodos(newTodos);
  }

  function handleDeleteTodo(index: number) {
    const newTodos  = todos.filter((_, i) => i !== index);
    setTodos(newTodos);
  }

  const filterdTodos = todos
  .filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  })
  .sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;

    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();
    return dateA - dateB;
  });

  function handleSaveEdit(index: number) {
    const newTodos = todos.map((todo, i) =>
      i === index
        ? { ...todo, text: editedText.trim() }
        : todo
    );
    newTodos[index].text = editedText.trim();
    setTodos(newTodos);
    setEditingIndex(null);
    setEditedText('');
  }

  useEffect(() => {
    const saved = localStorage.getItem('todos');
    if (saved) {
      try {
        const parsed: Todo[] = JSON.parse(saved);
        setTodos(parsed);
      } catch (e) {
        console.error("読み込み失敗", e);
      }  
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true
      return;
    }
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h1>Todoアプリ</h1>

      <form onSubmit={handleAddTodo}>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="タスクを入力してください"
          style={{ padding: '8px', marginRight: '8px', flex: 1 }}
        />
        <input
          type="datetime-local"
          value={newDueDate}
          onChange={(e) => setNewDewDate(e.target.value)}
          style={{ padding: '8px', marginRight: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 16px' }}>
          追加
        </button>
      </form>
      <div style={{ marginTop: '20px', marginBottom: '10px' }}>
        <button onClick={() => setFilter('all')} style={{ marginRight: '8px' }}>すべて</button>
        <button onClick={() => setFilter('active')} style={{ marginRight: '8px' }}>未完了</button>
        <button onClick={() => setFilter('completed')}>完了済み</button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px'}}>
        {filterdTodos.map((todo, index) => {
          const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date();

          return (
            <li key={index} style={{ padding: '8px 0', borderBottom: '1px solid #ccc', display: 'flex', alignItems: 'center' }}>
              <div style={{display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggleTodo(index)}
                  style={{ marginRight: '8px'}}
                />

                {editingIndex === index ? (
                  <input
                    type="text"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit(index);
                      }
                    }}
                    style={{ marginRight: '8px' }}
                  />
                ) : (  
                  <span style={{
                    textDecoration: todo.completed ? 'line-through' : 'none',
                    color: isOverdue && !todo.completed ? 'red' : 'black'
                  }}>
                    {todo.text}
                    {isOverdue && !todo.completed && (
                      <span style={{ marginLeft: '8px', color: 'red', fontWeight: 'bold' }}>
                        （期限切れ⚠️）
                      </span>
                    )}
                  </span>
                )}
                <span style={{ fontSize: '0.9em', color: '#666', marginLeft: '12px', marginRight: '12px' }}>
                    (期限: {todo.dueDate.replace('T', ' ').slice(0, 16)})
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setEditingIndex(index);
                    setEditedText(todo.text);
                  }}
                >
                  ✏️
                </button>    
                <button
                  onClick={() => handleDeleteTodo(index)}
                  style={{ marginLeft: '8px', padding: '4px 8px', color: 'red' }}
                >
                  ✖︎
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default App;