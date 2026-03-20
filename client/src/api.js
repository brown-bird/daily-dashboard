const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (res.status === 204) return null;
  return res.json();
}

export const fetchTasks = () => request('/tasks');
export const createTask = (text, type = 'planned') =>
  request('/tasks', { method: 'POST', body: JSON.stringify({ text, type }) });
export const updateTask = (id, updates) =>
  request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteTask = (id) =>
  request(`/tasks/${id}`, { method: 'DELETE' });
export const completeTask = (id) =>
  request(`/tasks/${id}/complete`, { method: 'POST' });
export const reorderTasks = (orderedIds) =>
  request('/tasks/reorder', { method: 'PUT', body: JSON.stringify({ orderedIds }) });

export const fetchCompleted = (date) =>
  request(`/completed${date ? `?date=${date}` : ''}`);
export const updateCompleted = (id, updates) =>
  request(`/completed/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteCompleted = (id) =>
  request(`/completed/${id}`, { method: 'DELETE' });
export const squashCompleted = (taskIds, text) =>
  request('/completed/squash', { method: 'POST', body: JSON.stringify({ taskIds, text }) });

export const checkRollover = () => request('/rollover/check');
export const executeRollover = () => request('/rollover/execute', { method: 'POST' });
export const fetchCarryover = () => request('/carryover');
export const acceptCarryover = (id) =>
  request(`/carryover/${id}/accept`, { method: 'POST' });
export const dropCarryover = (id) =>
  request(`/carryover/${id}/drop`, { method: 'POST' });

export const fetchStandup = () => request('/standup');
