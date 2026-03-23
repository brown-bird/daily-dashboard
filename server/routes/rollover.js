const express = require('express');
const router = express.Router();
const { FILES, readTasks, writeTasks, appendTask, removeTask } = require('../lib/fileStore');
const { getLocalDate, toLocalDate } = require('../lib/dateUtils');

// GET /api/rollover/check
router.get('/rollover/check', (req, res) => {
  const tz = req.query.tz;
  const today = getLocalDate(tz);
  const tasks = readTasks(FILES.TODAY);
  const stale = tasks.filter(t => toLocalDate(t.created, tz) !== today);
  res.json({ needed: stale.length > 0, staleTasks: stale });
});

// POST /api/rollover/execute
router.post('/rollover/execute', (req, res) => {
  const tz = req.query.tz;
  const today = getLocalDate(tz);
  const tasks = readTasks(FILES.TODAY);
  const incomplete = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress');

  // Move incomplete tasks to carryover with 'carried' status
  for (const task of incomplete) {
    task.status = 'carried';
    appendTask(FILES.CARRYOVER, task);
  }

  // Clear today.txt
  writeTasks(FILES.TODAY, []);

  res.json({ carriedOver: incomplete });
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
