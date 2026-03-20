const express = require('express');
const router = express.Router();
const { FILES, readTasks, writeTasks, appendTask, removeTask } = require('../lib/fileStore');

// GET /api/rollover/check
router.get('/rollover/check', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = readTasks(FILES.TODAY);
  const stale = tasks.filter(t => t.created.slice(0, 10) !== today);
  res.json({ needed: stale.length > 0, staleTasks: stale });
});

// POST /api/rollover/execute
router.post('/rollover/execute', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = readTasks(FILES.TODAY);
  const pending = tasks.filter(t => t.status === 'pending');

  // Move pending tasks to carryover with 'carried' status
  for (const task of pending) {
    task.status = 'carried';
    appendTask(FILES.CARRYOVER, task);
  }

  // Clear today.txt
  writeTasks(FILES.TODAY, []);

  res.json({ carriedOver: pending });
});

// GET /api/carryover
router.get('/carryover', (req, res) => {
  const tasks = readTasks(FILES.CARRYOVER);
  res.json(tasks);
});

// POST /api/carryover/:id/accept
router.post('/carryover/:id/accept', (req, res) => {
  const task = removeTask(FILES.CARRYOVER, req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  task.status = 'pending';
  appendTask(FILES.TODAY, task);
  res.json(task);
});

// POST /api/carryover/:id/drop
router.post('/carryover/:id/drop', (req, res) => {
  const task = removeTask(FILES.CARRYOVER, req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.status(204).end();
});

module.exports = router;
