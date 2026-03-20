const { v4: uuidv4 } = require('uuid');

function createTask(text, type = 'planned') {
  return {
    id: uuidv4().slice(0, 8),
    created: new Date().toISOString(),
    status: 'pending',
    type,
    text
  };
}

function serializeTask(task) {
  const fields = [task.id, task.created, task.status, task.type, task.text];
  if (task.completed) {
    fields.push(task.completed);
  }
  return fields.join('|');
}

function parseTask(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('|');
  if (parts.length < 5) return null;
  const task = {
    id: parts[0],
    created: parts[1],
    status: parts[2],
    type: parts[3],
    text: parts[4]
  };
  if (parts[5]) {
    task.completed = parts[5];
  }
  return task;
}

function completeTask(task) {
  return {
    ...task,
    status: 'done',
    completed: new Date().toISOString()
  };
}

module.exports = { createTask, serializeTask, parseTask, completeTask };
