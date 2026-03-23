'use strict';

const { createTask, serializeTask, parseTask, completeTask } = require('../lib/task');

describe('createTask', () => {
  test('returns an object with the provided text', () => {
    const task = createTask('Write tests');
    expect(task.text).toBe('Write tests');
  });

  test('id is 8 characters', () => {
    const task = createTask('foo');
    expect(task.id).toHaveLength(8);
  });

  test('status defaults to pending', () => {
    const task = createTask('foo');
    expect(task.status).toBe('pending');
  });

  test('type defaults to planned', () => {
    const task = createTask('foo');
    expect(task.type).toBe('planned');
  });

  test('type can be set to unplanned', () => {
    const task = createTask('foo', 'unplanned');
    expect(task.type).toBe('unplanned');
  });

  test('created is a valid ISO 8601 string', () => {
    const task = createTask('foo');
    expect(() => new Date(task.created)).not.toThrow();
    expect(new Date(task.created).toISOString()).toBe(task.created);
  });
});

describe('serializeTask', () => {
  const task = {
    id: 'a1b2c3d4',
    created: '2026-03-20T08:00:00.000Z',
    status: 'pending',
    type: 'planned',
    text: 'Review PR'
  };

  test('produces a pipe-delimited string with 5 fields', () => {
    const line = serializeTask(task);
    expect(line.split('|')).toHaveLength(5);
  });

  test('all fields are present in order', () => {
    const line = serializeTask(task);
    expect(line).toBe('a1b2c3d4|2026-03-20T08:00:00.000Z|pending|planned|Review PR');
  });

  test('includes completed timestamp as 6th field when present', () => {
    const completed = { ...task, completed: '2026-03-20T10:00:00.000Z' };
    const line = serializeTask(completed);
    const parts = line.split('|');
    expect(parts).toHaveLength(6);
    expect(parts[5]).toBe('2026-03-20T10:00:00.000Z');
  });
});

describe('parseTask', () => {
  const validLine = 'a1b2c3d4|2026-03-20T08:00:00.000Z|pending|planned|Review PR';

  test('parses a valid 5-field line', () => {
    const task = parseTask(validLine);
    expect(task).toEqual({
      id: 'a1b2c3d4',
      created: '2026-03-20T08:00:00.000Z',
      status: 'pending',
      type: 'planned',
      text: 'Review PR'
    });
  });

  test('parses completed field when present', () => {
    const line = validLine + '|2026-03-20T10:00:00.000Z';
    const task = parseTask(line);
    expect(task.completed).toBe('2026-03-20T10:00:00.000Z');
  });

  test('returns null for empty string', () => {
    expect(parseTask('')).toBeNull();
  });

  test('returns null for whitespace-only string', () => {
    expect(parseTask('   ')).toBeNull();
  });

  test('returns null for fewer than 5 fields', () => {
    expect(parseTask('a|b|c|d')).toBeNull();
  });
});

describe('completeTask', () => {
  const task = {
    id: 'a1b2c3d4',
    created: '2026-03-20T08:00:00.000Z',
    status: 'pending',
    type: 'planned',
    text: 'Review PR'
  };

  test('sets status to done', () => {
    expect(completeTask(task).status).toBe('done');
  });

  test('adds a valid ISO completed timestamp', () => {
    const completed = completeTask(task);
    expect(completed.completed).toBeDefined();
    expect(new Date(completed.completed).toISOString()).toBe(completed.completed);
  });

  test('preserves all original fields', () => {
    const completed = completeTask(task);
    expect(completed.id).toBe(task.id);
    expect(completed.created).toBe(task.created);
    expect(completed.type).toBe(task.type);
    expect(completed.text).toBe(task.text);
  });

  test('does not mutate the original task', () => {
    completeTask(task);
    expect(task.status).toBe('pending');
  });
});

describe('round-trip', () => {
  test('parseTask(serializeTask(task)) produces an identical object', () => {
    const task = {
      id: 'a1b2c3d4',
      created: '2026-03-20T08:00:00.000Z',
      status: 'in-progress',
      type: 'unplanned',
      text: 'Fix the thing'
    };
    expect(parseTask(serializeTask(task))).toEqual(task);
  });

  test('round-trip with completed field', () => {
    const task = {
      id: 'a1b2c3d4',
      created: '2026-03-20T08:00:00.000Z',
      status: 'done',
      type: 'planned',
      text: 'Done task',
      completed: '2026-03-20T15:00:00.000Z'
    };
    expect(parseTask(serializeTask(task))).toEqual(task);
  });
});
