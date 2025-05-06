import { db } from './firebase';
import { collection, addDoc, getDocs } from "firebase/firestore";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useState, useEffect } from 'react';
import { auth, provider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { query, where } from "firebase/firestore";
interface Todo {
  id: string;
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
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  async function handleAddTodo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newTodo.trim()) return;
  
    try {
      const docRef = await addDoc(collection(db, "todos"), {
        text: newTodo.trim(),
        completed: false,
        dueDate: newDueDate,
        uid: user.uid
      });
  
      const newTask: Todo = {
        id: docRef.id,
        text: newTodo.trim(),
        completed: false,
        dueDate: newDueDate
      };
  
      setTodos([...todos, newTask]);
      setNewTodo('');
      setNewDueDate('');
      console.log('Firestoreにタスク保存成功');
    } catch (error) {
      console.error('Firestore保存エラー:', error);
    }
  }

  async function handleToggleTodo(todo: Todo) {
    try {
      const updated = { ...todo, completed: !todo.completed };
      await updateDoc(doc(db, "todos", todo.id), {
        completed: updated.completed
      });
  
      setTodos(todos.map(t => t.id === todo.id ? updated : t));
    } catch (error) {
      console.error("完了状態の更新失敗:", error);
    }
  }

  async function handleDeleteTodo(id: string) {
    try {
      await deleteDoc(doc(db, "todos", id));
      setTodos(todos.filter((todo) => todo.id !== id));
    } catch (error) {
      console.error("消去エラー:", error);
    }
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

  async function handleSaveEdit(id: string) {
    try {
      await updateDoc(doc(db, "todos", id), {
        text: editedText.trim(),
      });
  
      setTodos(todos.map(todo =>
        todo.id === id ? { ...todo, text: editedText.trim() } : todo
      ));
  
      setEditingId(null);
      setEditedText('');
    } catch (error) {
      console.error("編集エラー:", error);
    }
  }

  function handleLogin() {
    signInWithPopup(auth, provider)
      .then((result) => {
        setUser(result.user);
      })
      .catch((error) => {
        console.error("ログインエラー", error);
      });
  }

  function handleLogout() {
    signOut(auth)
      .then(() => {
        setUser(null);
      })
      .catch((error) => {
        console.log("ログアウトエラー:", error);
      });
  }

  useEffect(() => {
    if (!user) return;

    const fetchTodos = async () => {
      try {
        const q = query(
          collection(db, "todos"),
          where("uid", "==", user.uid)
        );
        const querySnapshot = await getDocs(q)

        const fetchedTodos: Todo[] = [];
        querySnapshot.forEach((doc) => {
          fetchedTodos.push({
            ...(doc.data() as Todo),
            id: doc.id
          });
        });

        setTodos(fetchedTodos);
      } catch (error) {
        console.error("Firestore読み込みエラー", error);
      }
    };
    fetchTodos();
  }, [user]);

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h1>Todoアプリ</h1>

      <div style={{marginBottom: '20px' }}>
        {user ? (
          <div>
            <p>👤 {user.displayName}</p>
            <button onClick={handleLogout}>ログアウト</button>
          </div>
        ) : (
          <button onClick={handleLogin}>Googleでログイン</button>
        )}
      </div>

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
          onChange={(e) => setNewDueDate(e.target.value)}
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
        {filterdTodos.map((todo) => {
          const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date();

          return (
            <li key={todo.id} style={{ padding: '8px 0', borderBottom: '1px solid #ccc', display: 'flex', alignItems: 'center' }}>
              <div style={{display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggleTodo(todo)}
                  style={{ marginRight: '8px'}}
                />

                {editingId === todo.id ? (
                  <input
                    type="text"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit(todo.id);
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
                    setEditingId(todo.id);
                    setEditedText(todo.text);
                  }}
                >
                  ✏️
                </button>    
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
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