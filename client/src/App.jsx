import { useState, useEffect, useCallback } from 'react';
import AddTask from './components/AddTask';
import TaskList from './components/TaskList';
import CompletedList from './components/CompletedList';
import CarryoverBanner from './components/CarryoverBanner';
import StandupSummary from './components/StandupSummary';
import * as api from './api';
import './styles/app.css';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [carryover, setCarryover] = useState([]);
  const [showStandup, setShowStandup] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    const [todayTasks, completed, carryoverTasks] = await Promise.all([
      api.fetchTasks(),
      api.fetchCompleted(today),
      api.fetchCarryover()
    ]);
    setTasks(todayTasks);
    setCompletedToday(completed);
    setCarryover(carryoverTasks);
  }, [today]);

  useEffect(() => {
    async function init() {
      const rollover = await api.checkRollover();
      if (rollover.needed) {
        await api.executeRollover();
      }
      await loadData();
    }
    init();
  }, [loadData]);

  const handleAdd = async (text, type) => {
    const task = await api.createTask(text, type);
    setTasks(prev => [...prev, task]);
  };

  const handleComplete = async (id) => {
    const completed = await api.completeTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setCompletedToday(prev => [...prev, completed]);
  };

  const handleUpdate = async (id, updates) => {
    const updated = await api.updateTask(id, updates);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  const handleDelete = async (id) => {
    await api.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleReorder = async (reorderedTasks) => {
    setTasks(reorderedTasks);
    await api.reorderTasks(reorderedTasks.map(t => t.id));
  };

  const handleAcceptCarryover = async (id) => {
    const task = await api.acceptCarryover(id);
    setCarryover(prev => prev.filter(t => t.id !== id));
    setTasks(prev => [...prev, task]);
  };

  const handleDropCarryover = async (id) => {
    await api.dropCarryover(id);
    setCarryover(prev => prev.filter(t => t.id !== id));
  };

  const dateDisplay = new Date().toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Daily Dashboard</h1>
          <p className="date-display">{dateDisplay}</p>
        </div>
        <button className="standup-btn" onClick={() => setShowStandup(true)}>
          Standup
        </button>
      </header>

      <main className="app-main">
        <CarryoverBanner
          tasks={carryover}
          onAccept={handleAcceptCarryover}
          onDrop={handleDropCarryover}
        />

        <AddTask onAdd={handleAdd} />

        <section>
          <h2>Today</h2>
          <TaskList
            tasks={tasks}
            onReorder={handleReorder}
            onComplete={handleComplete}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </section>

        <CompletedList tasks={completedToday} />
      </main>

      <footer className="app-footer">
        <span>
          Tasks today: {tasks.length} active · {completedToday.length} done
        </span>
      </footer>

      <StandupSummary show={showStandup} onClose={() => setShowStandup(false)} />
    </div>
  );
}
