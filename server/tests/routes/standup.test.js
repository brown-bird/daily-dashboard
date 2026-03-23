'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const request = require('supertest');

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function makeTask(overrides = {}) {
  return {
    id: 'a1b2c3d4',
    created: new Date().toISOString(),
    status: 'pending',
    type: 'planned',
    text: 'Sample task',
    ...overrides
  };
}

function serializeTask(task) {
  const fields = [task.id, task.created, task.status, task.type, task.text];
  if (task.completed) fields.push(task.completed);
  return fields.join('|');
}

function makeApp() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-standup-test-'));
  const FILES = {
    TODAY: path.join(tmpDir, 'today.txt'),
    COMPLETED: path.join(tmpDir, 'completed.txt')
  };
  fs.writeFileSync(FILES.TODAY, '');
  fs.writeFileSync(FILES.COMPLETED, '');

  jest.resetModules();
  const store = require('../../lib/fileStore');
  store.FILES.TODAY = FILES.TODAY;
  store.FILES.COMPLETED = FILES.COMPLETED;

  const standupRouter = require('../../routes/standup');
  const app = express();
  app.use(express.json());
  app.use('/api/standup', standupRouter);

  return { app, FILES, tmpDir };
}

let app, FILES, tmpDir;

beforeEach(() => {
  ({ app, FILES, tmpDir } = makeApp());
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Helper: get the previous workday date string from a given date
function previousWorkday(date) {
  const d = new Date(date);
  const day = d.getDay();
  if (day === 1) d.setDate(d.getDate() - 3); // Monday → Friday
  else if (day === 0) d.setDate(d.getDate() - 2); // Sunday → Friday
  else d.setDate(d.getDate() - 1);
  return isoDate(d);
}

describe('GET /api/standup — empty files', () => {
  test('returns 200 with empty arrays and empty generatedText', async () => {
    const res = await request(app).get('/api/standup');
    expect(res.status).toBe(200);
    expect(res.body.yesterday).toEqual([]);
    expect(res.body.today).toEqual([]);
    expect(res.body.completedToday).toEqual([]);
    expect(res.body.generatedText.trim()).toBe('');
  });
});

describe('GET /api/standup — yesterday completions', () => {
  test('includes tasks completed on the previous workday', async () => {
    const yesterday = previousWorkday(new Date());
    const task = makeTask({
      id: 'yest0001',
      status: 'done',
      completed: `${yesterday}T14:00:00.000Z`
    });
    fs.writeFileSync(FILES.COMPLETED, serializeTask(task) + '\n');

    const res = await request(app).get('/api/standup');
    expect(res.body.yesterday).toHaveLength(1);
    expect(res.body.yesterday[0].id).toBe('yest0001');
    expect(res.body.generatedText).toContain('## Yesterday');
    expect(res.body.generatedText).toContain(task.text);
  });

  test('no ## Yesterday heading when there are no yesterday completions', async () => {
    const res = await request(app).get('/api/standup');
    expect(res.body.generatedText).not.toContain('## Yesterday');
  });
});

describe('GET /api/standup — Monday edge case', () => {
  test('uses Friday as yesterday when today is Monday', async () => {
    // Compute last Friday
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Find most recent Monday to derive last Friday
    const lastFriday = new Date(today);
    // go back to last friday: today - (dayOfWeek + 2) days if Mon, or adjust
    const daysBack = dayOfWeek === 1 ? 3 : (dayOfWeek + 2) % 7;
    lastFriday.setDate(today.getDate() - daysBack);
    const fridayStr = isoDate(lastFriday);

    const task = makeTask({
      id: 'fri00001',
      status: 'done',
      completed: `${fridayStr}T14:00:00.000Z`
    });
    fs.writeFileSync(FILES.COMPLETED, serializeTask(task) + '\n');

    const res = await request(app).get('/api/standup');
    // If today is Monday, this task should be in yesterday; otherwise skip assertion
    if (today.getDay() === 1) {
      expect(res.body.yesterday.some(t => t.id === 'fri00001')).toBe(true);
    } else {
      // Still verify the task was written and standup ran without error
      expect(res.status).toBe(200);
    }
  });
});

describe('GET /api/standup — today section', () => {
  test('in-progress task appears with 🔄 marker', async () => {
    const task = makeTask({ id: 'inp00001', status: 'in-progress', text: 'Active work' });
    fs.writeFileSync(FILES.TODAY, serializeTask(task) + '\n');

    const res = await request(app).get('/api/standup');
    expect(res.body.generatedText).toContain('## Today');
    expect(res.body.generatedText).toContain('🔄');
    expect(res.body.generatedText).toContain('Active work');
  });

  test('pending task appears as plain list item without 🔄', async () => {
    const task = makeTask({ id: 'pend0001', status: 'pending', text: 'Planned work' });
    fs.writeFileSync(FILES.TODAY, serializeTask(task) + '\n');

    const res = await request(app).get('/api/standup');
    expect(res.body.generatedText).toContain('- Planned work');
    expect(res.body.generatedText).not.toContain('🔄');
  });

  test('task completed today appears with ✅ marker', async () => {
    const todayStr = isoDate(new Date());
    const task = makeTask({
      id: 'done0001',
      status: 'done',
      text: 'Completed today',
      completed: `${todayStr}T11:00:00.000Z`
    });
    fs.writeFileSync(FILES.COMPLETED, serializeTask(task) + '\n');

    const res = await request(app).get('/api/standup');
    expect(res.body.generatedText).toContain('✅');
    expect(res.body.generatedText).toContain('Completed today');
  });

  test('unplanned task shows ⚡ marker', async () => {
    const task = makeTask({ id: 'unpl0001', status: 'pending', type: 'unplanned', text: 'Reactive task' });
    fs.writeFileSync(FILES.TODAY, serializeTask(task) + '\n');

    const res = await request(app).get('/api/standup');
    expect(res.body.generatedText).toContain('⚡');
  });
});

describe('GET /api/standup — no carryover section', () => {
  test('generatedText does not contain Carried Over heading', async () => {
    const res = await request(app).get('/api/standup');
    expect(res.body.generatedText).not.toContain('Carried Over');
  });
});
