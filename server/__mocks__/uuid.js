'use strict';

// CJS-compatible uuid mock for Jest tests (uuid v13 is ESM-only and
// cannot be required directly by Jest's CJS module system).
// Generates deterministic IDs that satisfy the 8-char slice in createTask.

let counter = 0;

const v4 = () => {
  counter++;
  return `test${String(counter).padStart(4, '0')}-0000-0000-0000-000000000000`;
};

const resetCounter = () => { counter = 0; };

module.exports = { v4, resetCounter };
