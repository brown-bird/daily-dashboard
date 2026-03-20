const express = require('express');
const router = express.Router();
const { FILES, readTasks } = require('../lib/fileStore');

// GET /api/completed?date=YYYY-MM-DD
router.get('/', (req, res) => {
  const tasks = readTasks(FILES.COMPLETED);
  const { date } = req.query;
  if (date) {
    const filtered = tasks.filter(t => {
      if (!t.completed) return false;
      return t.completed.slice(0, 10) === date;
    });
    return res.json(filtered);
  }
  res.json(tasks);
});

module.exports = router;
