import { db } from './firebase';
import { collection, addDoc, getDocs } from "firebase/firestore";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useState, useEffect } from 'react';
import { auth, provider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { query, where } from "firebase/firestore";
import { onAuthStateChanged } from 'firebase/auth';
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
  uid: string;
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
  const [editedDueDate, setEditedDueDate] = useState<string>('');
  // 1つだけに統一
  const [filterRange, setFilterRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

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
        dueDate: newDueDate,
        uid: user.uid
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

  async function handleSaveEdit(id: string) {
    try {
      await updateDoc(doc(db, "todos", id), {
        text: editedText.trim(),
        dueDate: editedDueDate
      });
  
      setTodos(todos.map(todo =>
        todo.id === id
          ? { ...todo, text: editedText.trim(), dueDate: editedDueDate }
          : todo
      ));
  
      setEditingId(null);
      setEditedText('');
      setEditedDueDate('')
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

  // 2. 日付判定関数たち
  function isToday(dateStr: string) {
    const today = new Date();
    const d = new Date(dateStr);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }

  function isThisWeek(dateStr: string) {
    const now = new Date();
    const d = new Date(dateStr);
  
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay());
  
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
  
    return d >= startOfWeek && d <= endOfWeek;
  }

  function isThisMonth(dateStr: string) {
    const now = new Date();
    const d = new Date(dateStr);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  }

  // 3. 統計用のフィルター適用
  // 表示フィルター
  const filteredTodos = todos
  .filter((todo) => {
    // ステータスフィルター
    const statusOk =
      filter === 'all' ||
      (filter === 'active' && !todo.completed) ||
      (filter === 'completed' && todo.completed);

    // 日付フィルター
    const dateOk =
      filterRange === 'all' ||
      (filterRange === 'today' && isToday(todo.dueDate)) ||
      (filterRange === 'week' && isThisWeek(todo.dueDate)) ||
      (filterRange === 'month' && isThisMonth(todo.dueDate));

    return statusOk && dateOk;
  })
  .sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const filteredTodosForStats = todos
  .filter((todo) => {
    if (!todo.dueDate) return false;
    if (filterRange === 'today') return isToday(todo.dueDate);
    if (filterRange === 'week') return isThisWeek(todo.dueDate);
    if (filterRange === 'month') return isThisMonth(todo.dueDate);
    return true;
  });

  // 統計もこの filteredTodos を使うだけ！
  const totalCount = filteredTodosForStats.length;
  const completedCount = filteredTodosForStats.filter(todo => todo.completed).length;
  const activeCount = totalCount - completedCount;
  const completionRate = totalCount > 0 ? Math.floor((completedCount / totalCount) * 100) : 0;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setTodos([]); // ← ログアウトしたらタスク消す！
      }
    });
  
    return () => unsubscribe(); // クリーンアップ
  }, []);

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
    <div className="w-full max-w-screen-xl mx-auto p-4">
      <div className="bg-white p-6 shadow-md rounded-md">
        <h1 className="text-3xl text-black font-bold mb-4">Todoアプリ</h1>

        <div style={{marginBottom: '20px' }}>
          {user ? (
            <div className="flex items-center gap-2 mb-4">
              <img
                src={user.photoURL || '/default-avatar.png'}
                alt="User Icon"
                className="w-10 h-10 rounded-full"
              />
              <p className="text-lg font-semibold text-gray-800">{user.displayName}</p>
              <button onClick={handleLogout} className="text-sm text-red-600 hover:underline hover:text-red-800 font-medium">ログアウト</button>
            </div>
          ) : (
            <button onClick={handleLogin}>Googleでログイン</button>
          )}
        </div>

        <form onSubmit={handleAddTodo} className="flex flex-wrap items-center gap-2 mt-4">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="タスクを入力してください"
            style={{ padding: '8px', marginRight: '8px', flex: 1 }}
          />
          <div className="flex items-center space-x-1">
          <label htmlFor="dueDate" className="text-black">期限：</label>
          <input
            type="datetime-local"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            style={{ padding: '8px', marginRight: '8px' }}
          />
          </div>
          <button type="submit" style={{ padding: '8px 16px' }}>
            追加
          </button>
        </form>

        <div className="bg-gray-100 text-black text-sm p-4 rounded shadow mb-4">
          <p className="font-semibold mb-2">📊 タスク統計（{filterRange === 'all' ? '全体' : filterRange === 'today' ? '今日' : filterRange === 'week' ? '今週' : '今月'}）</p>
          <ul className="space-y-1">
            <li>全体：{totalCount} 件</li>
            <li>完了：{completedCount} 件</li>
            <li>未完了：{activeCount} 件</li>
            <li>完了率：{completionRate} %</li>
          </ul>
        </div>

        <div className="mt-4 mb-2 flex gap-2 text-sm">
          <button
            onClick={() => setFilterRange('all')}
            className={`${filterRange === 'all' ? 'bg-blue-100 border border-blue-500 text-blue-700' : 'text-black'} px-2 py-1 rounded`}
          >
            全体
          </button>
          <button
            onClick={() => setFilterRange('today')}
            className={`${filterRange === 'today' ? 'bg-blue-100 border border-blue-500 text-blue-700' : 'text-black'} px-2 py-1 rounded`}
          >
            今日
          </button>
          <button
            onClick={() => setFilterRange('week')}
            className={`${filterRange === 'week' ? 'bg-blue-100 border border-blue-500 text-blue-700' : 'text-black'} px-2 py-1 rounded`}
          >
            今週
          </button>
          <button
            onClick={() => setFilterRange('month')}
            className={`${filterRange === 'month' ? 'bg-blue-100 border border-blue-500 text-blue-700' : 'text-black'} px-2 py-1 rounded`}
          >
            今月
          </button>
        </div>

        <div className="mt-4 mb-2 flex gap-2 text-sm">
          <button
            onClick={() => setFilter('all')}
            className={`${filter === 'all' ? 'bg-blue-100 border border-blue-500 text-blue-700' : 'text-black'} px-2 py-1 rounded`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`${filter === 'active' ? 'bg-blue-100 border border-blue-500 text-blue-700' : 'text-black'} px-2 py-1 rounded`}
          >
            未完了
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`${filter === 'completed' ? 'bg-blue-100 border border-blue-500 text-blue-700' : 'text-black'} px-2 py-1 rounded`}
          >
            完了済み
          </button>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px'}}>
          {filteredTodos.map((todo) => {
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
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        placeholder="タスクを編集"
                      />
                      <input
                        type="datetime-local"
                        value={editedDueDate}
                        onChange={(e) => setEditedDueDate(e.target.value)}
                      />
                      <button onClick={() => handleSaveEdit(todo.id)}>保存</button>
                    </div>
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
                      setEditedDueDate(todo.dueDate);
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
    </div>
  );
}

export default App;