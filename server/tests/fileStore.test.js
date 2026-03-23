'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// Build isolated file store pointing at a temp directory
function makeIsolatedStore() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-test-'));
  const FILES = {
    TODAY: path.join(tmpDir, 'today.txt'),
    COMPLETED: path.join(tmpDir, 'completed.txt')
  };
  // Write empty files so ensureDataDir is satisfied
  fs.writeFileSync(FILES.TODAY, '');
  fs.writeFileSync(FILES.COMPLETED, '');

  // Load the module with patched FILES by resetting the module cache and
  // monkey-patching the exported FILES object before tests run
  jest.resetModules();
  const store = require('../lib/fileStore');
  // Redirect the module's FILES to our tmp paths
  store.FILES.TODAY = FILES.TODAY;
  store.FILES.COMPLETED = FILES.COMPLETED;

  return { store, FILES, tmpDir };
}

let store, FILES, tmpDir;

beforeEach(() => {
  ({ store, FILES, tmpDir } = makeIsolatedStore());
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const sampleTask = {
  id: 'a1b2c3d4',
  created: '2026-03-20T08:00:00.000Z',
  status: 'pending',
  type: 'planned',
  text: 'Sample task'
};

describe('readTasks', () => {
  test('returns empty array for an empty file', () => {
    expect(store.readTasks(FILES.TODAY)).toEqual([]);
  });
});

describe('writeTasks / readTasks round-trip', () => {
  test('preserves all task fields', () => {
    store.writeTasks(FILES.TODAY, [sampleTask]);
    const result = store.readTasks(FILES.TODAY);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(sampleTask);
  });

  test('preserves multiple tasks in order', () => {
    const tasks = [
      { ...sampleTask, id: 'aaaaaaaa', text: 'First' },
      { ...sampleTask, id: 'bbbbbbbb', text: 'Second' }
    ];
    store.writeTasks(FILES.TODAY, tasks);
    const result = store.readTasks(FILES.TODAY);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('First');
    expect(result[1].text).toBe('Second');
  });

  test('writing empty array produces an empty file', () => {
    store.writeTasks(FILES.TODAY, [sampleTask]);
    store.writeTasks(FILES.TODAY, []);
    const content = fs.readFileSync(FILES.TODAY, 'utf-8');
    expect(content).toBe('');
    expect(store.readTasks(FILES.TODAY)).toEqual([]);
  });
});

describe('appendTask', () => {
  test('appends to an empty file', () => {
    store.appendTask(FILES.TODAY, sampleTask);
    const result = store.readTasks(FILES.TODAY);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(sampleTask);
  });

  test('appends to existing tasks without overwriting', () => {
    const first = { ...sampleTask, id: 'aaaaaaaa', text: 'First' };
    const second = { ...sampleTask, id: 'bbbbbbbb', text: 'Second' };
    store.writeTasks(FILES.TODAY, [first]);
    store.appendTask(FILES.TODAY, second);
    const result = store.readTasks(FILES.TODAY);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('aaaaaaaa');
    expect(result[1].id).toBe('bbbbbbbb');
  });
});

describe('removeTask', () => {
  test('removes a task by id and returns it', () => {
    store.writeTasks(FILES.TODAY, [sampleTask]);
    const removed = store.removeTask(FILES.TODAY, sampleTask.id);
    expect(removed).toEqual(sampleTask);
    expect(store.readTasks(FILES.TODAY)).toHaveLength(0);
  });

  test('returns null when id is not found', () => {
    store.writeTasks(FILES.TODAY, [sampleTask]);
    const result = store.removeTask(FILES.TODAY, 'nonexistent');
    expect(result).toBeNull();
  });

  test('leaves other tasks intact', () => {
    const other = { ...sampleTask, id: 'bbbbbbbb', text: 'Other' };
    store.writeTasks(FILES.TODAY, [sampleTask, other]);
    store.removeTask(FILES.TODAY, sampleTask.id);
    const remaining = store.readTasks(FILES.TODAY);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('bbbbbbbb');
  });

  test('file is unchanged when id not found', () => {
    store.writeTasks(FILES.TODAY, [sampleTask]);
    store.removeTask(FILES.TODAY, 'nonexistent');
    expect(store.readTasks(FILES.TODAY)).toHaveLength(1);
  });
});

describe('getTaskById', () => {
  test('returns the matching task', () => {
    store.writeTasks(FILES.TODAY, [sampleTask]);
    expect(store.getTaskById(FILES.TODAY, sampleTask.id)).toEqual(sampleTask);
  });

  test('returns null when not found', () => {
    store.writeTasks(FILES.TODAY, [sampleTask]);
    expect(store.getTaskById(FILES.TODAY, 'nonexistent')).toBeNull();
  });
});
