const express = require('express');
const router = express.Router();
const { createTask, completeTask } = require('../lib/task');
const { FILES, readTasks, writeTasks, appendTask, removeTask, getTaskById } = require('../lib/fileStore');

// GET /api/tasks — return today's tasks
router.get('/', (req, res) => {
  const tasks = readTasks(FILES.TODAY);
  res.json(tasks);
});

// POST /api/tasks — add a new task
router.post('/', (req, res) => {
  const { text, type } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Task text is required' });
  }
  const task = createTask(text.trim(), type || 'planned');
  appendTask(FILES.TODAY, task);
  res.status(201).json(task);
});

// PUT /api/tasks/reorder — reorder tasks
router.put('/reorder', (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds array is required' });
  }
  const tasks = readTasks(FILES.TODAY);
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const reordered = orderedIds
    .map(id => taskMap.get(id))
    .filter(Boolean);
  // Append any tasks not in orderedIds (shouldn't happen, but safe)
  for (const task of tasks) {
    if (!orderedIds.includes(task.id)) {
      reordered.push(task);
    }
  }
  writeTasks(FILES.TODAY, reordered);
  res.json(reordered);
});

// PUT /api/tasks/:id — update a task
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { text, type } = req.body;
  const tasks = readTasks(FILES.TODAY);
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  if (text !== undefined) tasks[idx].text = text.trim();
  if (type !== undefined) tasks[idx].type = type;
  writeTasks(FILES.TODAY, tasks);
  res.json(tasks[idx]);
});

// DELETE /api/tasks/:id — remove a task
router.delete('/:id', (req, res) => {
  const removed = removeTask(FILES.TODAY, req.params.id);
  if (!removed) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.status(204).end();
});

// POST /api/tasks/:id/start — move task to in-progress
router.post('/:id/start', (req, res) => {
  const { id } = req.params;
  const tasks = readTasks(FILES.TODAY);
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  tasks[idx].status = 'in-progress';
  writeTasks(FILES.TODAY, tasks);
  res.json(tasks[idx]);
});

// POST /api/tasks/:id/unstart — move task back to pending
router.post('/:id/unstart', (req, res) => {
  const { id } = req.params;
  const tasks = readTasks(FILES.TODAY);
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  tasks[idx].status = 'pending';
  writeTasks(FILES.TODAY, tasks);
  res.json(tasks[idx]);
});

// POST /api/tasks/:id/complete — complete a task
router.post('/:id/complete', (req, res) => {
  const task = removeTask(FILES.TODAY, req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const completed = completeTask(task);
  appendTask(FILES.COMPLETED, completed);
  res.json(completed);
});

// POST /api/tasks/:id/uncomplete — reopen a completed task as in-progress or pending
router.post('/:id/uncomplete', (req, res) => {
  const task = removeTask(FILES.COMPLETED, req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const status = req.body?.status === 'pending' ? 'pending' : 'in-progress';
  task.status = status;
  delete task.completed;
  appendTask(FILES.TODAY, task);
  res.json(task);
});

module.exports = router;
