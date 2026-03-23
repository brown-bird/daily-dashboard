'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const request = require('supertest');

function makeApp() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-tasks-test-'));
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

  const tasksRouter = require('../../routes/tasks');
  const app = express();
  app.use(express.json());
  app.use('/api/tasks', tasksRouter);

  return { app, tmpDir };
}

let app, tmpDir;

beforeEach(() => {
  ({ app, tmpDir } = makeApp());
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('GET /api/tasks', () => {
  test('returns 200 and empty array when no tasks', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/tasks', () => {
  test('creates a task and returns 201', async () => {
    const res = await request(app).post('/api/tasks').send({ text: 'Write tests' });
    expect(res.status).toBe(201);
    expect(res.body.text).toBe('Write tests');
    expect(res.body.status).toBe('pending');
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 when text is missing', async () => {
    const res = await request(app).post('/api/tasks').send({});
    expect(res.status).toBe(400);
  });

  test('returns 400 when text is whitespace only', async () => {
    const res = await request(app).post('/api/tasks').send({ text: '   ' });
    expect(res.status).toBe(400);
  });

  test('sets type to unplanned when provided', async () => {
    const res = await request(app).post('/api/tasks').send({ text: 'foo', type: 'unplanned' });
    expect(res.body.type).toBe('unplanned');
  });

  test('created task appears in subsequent GET', async () => {
    await request(app).post('/api/tasks').send({ text: 'Visible task' });
    const res = await request(app).get('/api/tasks');
    expect(res.body.some(t => t.text === 'Visible task')).toBe(true);
  });
});

describe('POST /api/tasks/:id/start', () => {
  test('sets status to in-progress', async () => {
    const { body: task } = await request(app).post('/api/tasks').send({ text: 'Task' });
    const res = await request(app).post(`/api/tasks/${task.id}/start`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in-progress');
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).post('/api/tasks/nonexistent/start');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tasks/:id/unstart', () => {
  test('sets status back to pending', async () => {
    const { body: task } = await request(app).post('/api/tasks').send({ text: 'Task' });
    await request(app).post(`/api/tasks/${task.id}/start`);
    const res = await request(app).post(`/api/tasks/${task.id}/unstart`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
  });
});

describe('POST /api/tasks/:id/complete', () => {
  test('returns done task with completed timestamp', async () => {
    const { body: task } = await request(app).post('/api/tasks').send({ text: 'Task' });
    const res = await request(app).post(`/api/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completed).toBeDefined();
  });

  test('removes task from today list', async () => {
    const { body: task } = await request(app).post('/api/tasks').send({ text: 'Task' });
    await request(app).post(`/api/tasks/${task.id}/complete`);
    const res = await request(app).get('/api/tasks');
    expect(res.body.some(t => t.id === task.id)).toBe(false);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).post('/api/tasks/nonexistent/complete');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/tasks/:id/uncomplete', () => {
  async function createCompleted() {
    const { body: task } = await request(app).post('/api/tasks').send({ text: 'Task' });
    await request(app).post(`/api/tasks/${task.id}/complete`);
    return task;
  }

  test('defaults to in-progress status', async () => {
    const task = await createCompleted();
    const res = await request(app).post(`/api/tasks/${task.id}/uncomplete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in-progress');
    expect(res.body.completed).toBeUndefined();
  });

  test('sets to pending when status param is pending', async () => {
    const task = await createCompleted();
    const res = await request(app)
      .post(`/api/tasks/${task.id}/uncomplete`)
      .send({ status: 'pending' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
  });

  test('task reappears in today list', async () => {
    const task = await createCompleted();
    await request(app).post(`/api/tasks/${task.id}/uncomplete`);
    const res = await request(app).get('/api/tasks');
    expect(res.body.some(t => t.id === task.id)).toBe(true);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).post('/api/tasks/nonexistent/uncomplete');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/tasks/:id', () => {
  test('updates task text', async () => {
    const { body: task } = await request(app).post('/api/tasks').send({ text: 'Old text' });
    const res = await request(app).put(`/api/tasks/${task.id}`).send({ text: 'New text' });
    expect(res.status).toBe(200);
    expect(res.body.text).toBe('New text');
  });

  test('updates task type', async () => {
    const { body: task } = await request(app).post('/api/tasks').send({ text: 'Task' });
    const res = await request(app).put(`/api/tasks/${task.id}`).send({ type: 'unplanned' });
    expect(res.body.type).toBe('unplanned');
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).put('/api/tasks/nonexistent').send({ text: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  test('returns 204 and removes the task', async () => {
    const { body: task } = await request(app).post('/api/tasks').send({ text: 'To delete' });
    const res = await request(app).delete(`/api/tasks/${task.id}`);
    expect(res.status).toBe(204);
    const list = await request(app).get('/api/tasks');
    expect(list.body.some(t => t.id === task.id)).toBe(false);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/tasks/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/tasks/reorder', () => {
  test('reorders tasks to match orderedIds', async () => {
    const { body: t1 } = await request(app).post('/api/tasks').send({ text: 'First' });
    const { body: t2 } = await request(app).post('/api/tasks').send({ text: 'Second' });
    const res = await request(app)
      .put('/api/tasks/reorder')
      .send({ orderedIds: [t2.id, t1.id] });
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(t2.id);
    expect(res.body[1].id).toBe(t1.id);
  });
});
