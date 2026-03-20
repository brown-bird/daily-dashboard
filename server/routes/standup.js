const express = require('express');
const router = express.Router();
const { FILES, readTasks } = require('../lib/fileStore');

function getPreviousWorkday(date) {
  const d = new Date(date);
  const day = d.getDay();
  if (day === 1) {
    // Monday → Friday
    d.setDate(d.getDate() - 3);
  } else if (day === 0) {
    // Sunday → Friday
    d.setDate(d.getDate() - 2);
  } else {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

function formatTaskLine(task) {
  const marker = task.type === 'unplanned' ? ' \u26a1 unplanned' : '';
  return `- ${task.text}${marker}`;
}

// GET /api/standup
router.get('/', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = getPreviousWorkday(new Date());

  const completedTasks = readTasks(FILES.COMPLETED);
  const todayTasks = readTasks(FILES.TODAY);
  const carryoverTasks = readTasks(FILES.CARRYOVER);

  const yesterday = completedTasks.filter(t =>
    t.completed && t.completed.slice(0, 10) === yesterdayDate
  );

  // Also include tasks completed today
  const completedToday = completedTasks.filter(t =>
    t.completed && t.completed.slice(0, 10) === today
  );

  // Build formatted text
  let text = '';

  if (yesterday.length > 0) {
    text += '## Yesterday\n';
    yesterday.forEach(t => {
      const marker = t.type === 'unplanned' ? ' \u26a1 unplanned' : '';
      text += `- \u2705 ${t.text}${marker}\n`;
    });
    text += '\n';
  }

  if (todayTasks.length > 0 || completedToday.length > 0) {
    text += '## Today\n';
    completedToday.forEach(t => {
      const marker = t.type === 'unplanned' ? ' \u26a1 unplanned' : '';
      text += `- \u2705 ${t.text}${marker}\n`;
    });
    todayTasks.forEach(t => {
      text += `${formatTaskLine(t)}\n`;
    });
    text += '\n';
  }

  if (carryoverTasks.length > 0) {
    text += '## Carried Over\n';
    carryoverTasks.forEach(t => {
      const fromDate = t.created.slice(0, 10);
      text += `- \u26a0\ufe0f ${t.text} (from ${fromDate})\n`;
    });
    text += '\n';
  }

  res.json({
    yesterday,
    today: todayTasks,
    completedToday,
    carriedOver: carryoverTasks,
    generatedText: text.trim()
  });
});

module.exports = router;
