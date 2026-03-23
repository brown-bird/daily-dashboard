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
  const [squashMode, setSquashMode] = useState(false);
  const [selectedForSquash, setSelectedForSquash] = useState(new Set());

  const today = new Date().toLocaleDateString('en-CA');

  const todoTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');

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

  const handleStart = async (id) => {
    const updated = await api.startTask(id);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  const handleUnstart = async (id) => {
    const updated = await api.unstartTask(id);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  const handleComplete = async (id) => {
    const completed = await api.completeTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setCompletedToday(prev => [...prev, completed]);
  };

  const handleUncomplete = async (id) => {
    const task = await api.uncompleteTask(id);
    setCompletedToday(prev => prev.filter(t => t.id !== id));
    setTasks(prev => [...prev, task]);
  };

  const handleUpdate = async (id, updates) => {
    const updated = await api.updateTask(id, updates);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
  };

  const handleDelete = async (id) => {
    await api.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateCompleted = async (id, updates) => {
    const updated = await api.updateCompleted(id, updates);
    setCompletedToday(prev => prev.map(t => t.id === id ? updated : t));
  };

  const handleDeleteCompleted = async (id) => {
    await api.deleteCompleted(id);
    setCompletedToday(prev => prev.filter(t => t.id !== id));
  };

  const handleSquash = async (summaryText) => {
    const merged = await api.squashCompleted([...selectedForSquash], summaryText);
    setCompletedToday(prev => [
      ...prev.filter(t => !selectedForSquash.has(t.id)),
      merged
    ]);
    setSquashMode(false);
    setSelectedForSquash(new Set());
  };

  const toggleSquashMode = () => {
    setSquashMode(m => !m);
    setSelectedForSquash(new Set());
  };

  const toggleSquashSelection = (id) => {
    setSelectedForSquash(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReorderTodo = async (reorderedTasks) => {
    const newTasks = [...reorderedTasks, ...inProgressTasks];
    setTasks(newTasks);
    await api.reorderTasks(newTasks.map(t => t.id));
  };

  const handleReorderInProgress = async (reorderedTasks) => {
    const newTasks = [...todoTasks, ...reorderedTasks];
    setTasks(newTasks);
    await api.reorderTasks(newTasks.map(t => t.id));
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
          <h2>Todo</h2>
          <TaskList
            tasks={todoTasks}
            section="todo"
            onReorder={handleReorderTodo}
            onStart={handleStart}
            onComplete={handleComplete}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            emptyMessage="No tasks yet — add one above"
          />
        </section>

        <section>
          <h2>In Progress</h2>
          <TaskList
            tasks={inProgressTasks}
            section="in-progress"
            onReorder={handleReorderInProgress}
            onUnstart={handleUnstart}
            onComplete={handleComplete}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            emptyMessage="Start a task to move it here"
          />
        </section>

        <CompletedList
          tasks={completedToday}
          onUpdate={handleUpdateCompleted}
          onDelete={handleDeleteCompleted}
          onUncomplete={handleUncomplete}
          squashMode={squashMode}
          selectedForSquash={selectedForSquash}
          onToggleSquashMode={toggleSquashMode}
          onToggleSquashSelection={toggleSquashSelection}
          onSquash={handleSquash}
        />
      </main>

      <footer className="app-footer">
        <span>
          Tasks today: {todoTasks.length} todo · {inProgressTasks.length} in progress · {completedToday.length} done
        </span>
      </footer>

      <StandupSummary show={showStandup} onClose={() => setShowStandup(false)} />
    </div>
  );
}
