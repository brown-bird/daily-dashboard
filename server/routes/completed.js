const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { FILES, readTasks, writeTasks, removeTask } = require('../lib/fileStore');
const { toLocalDate } = require('../lib/dateUtils');

// GET /api/completed?date=YYYY-MM-DD&tz=America/Boise
router.get('/', (req, res) => {
  const tasks = readTasks(FILES.COMPLETED);
  const { date, tz } = req.query;
  if (date) {
    const filtered = tasks.filter(t => {
      if (!t.completed) return false;
      return toLocalDate(t.completed, tz) === date;
    });
    return res.json(filtered);
  }
  res.json(tasks);
});

// POST /api/completed/squash — must be before /:id routes
router.post('/squash', (req, res) => {
  const { taskIds, text } = req.body;
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length < 2 || !text) {
    return res.status(400).json({ error: 'Requires at least 2 taskIds and text' });
  }
  const tasks = readTasks(FILES.COMPLETED);
  const matched = tasks.filter(t => taskIds.includes(t.id));
  if (matched.length < 2) {
    return res.status(400).json({ error: 'Could not find at least 2 matching tasks' });
  }
  const merged = {
    id: uuidv4().slice(0, 8),
    created: matched.reduce((earliest, t) => t.created < earliest ? t.created : earliest, matched[0].created),
    status: 'done',
    type: matched.some(t => t.type === 'unplanned') ? 'unplanned' : 'planned',
    text: text.trim(),
    completed: matched.reduce((latest, t) => t.completed > latest ? t.completed : latest, matched[0].completed)
  };
  const remaining = tasks.filter(t => !taskIds.includes(t.id));
  remaining.push(merged);
  writeTasks(FILES.COMPLETED, remaining);
  res.status(201).json(merged);
});

// PUT /api/completed/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { text, type } = req.body;
  const tasks = readTasks(FILES.COMPLETED);
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Completed task not found' });
  }
  if (text !== undefined) tasks[idx].text = text.trim();
  if (type !== undefined) tasks[idx].type = type;
  writeTasks(FILES.COMPLETED, tasks);
  res.json(tasks[idx]);
});

// DELETE /api/completed/:id
router.delete('/:id', (req, res) => {
  const removed = removeTask(FILES.COMPLETED, req.params.id);
  if (!removed) {
    return res.status(404).json({ error: 'Completed task not found' });
  }
  res.status(204).end();
});

module.exports = router;
