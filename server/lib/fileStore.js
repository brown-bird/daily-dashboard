const fs = require('fs');
const path = require('path');
const { parseTask, serializeTask } = require('./task');

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

const FILES = {
  TODAY: path.join(DATA_DIR, 'todo.txt'),
  COMPLETED: path.join(DATA_DIR, 'completed.txt')
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  for (const file of Object.values(FILES)) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '');
    }
  }
}

function readTasks(file) {
  ensureDataDir();
  const content = fs.readFileSync(file, 'utf-8');
  return content
    .split('\n')
    .map(parseTask)
    .filter(Boolean);
}

function writeTasks(file, tasks) {
  ensureDataDir();
  const content = tasks.map(serializeTask).join('\n');
  fs.writeFileSync(file, content ? content + '\n' : '');
}

function appendTask(file, task) {
  ensureDataDir();
  fs.appendFileSync(file, serializeTask(task) + '\n');
}

function removeTask(file, taskId) {
  const tasks = readTasks(file);
  const filtered = tasks.filter(t => t.id !== taskId);
  writeTasks(file, filtered);
  return tasks.find(t => t.id === taskId) || null;
}

function getTaskById(file, taskId) {
  const tasks = readTasks(file);
  return tasks.find(t => t.id === taskId) || null;
}

module.exports = { FILES, readTasks, writeTasks, appendTask, removeTask, getTaskById };
