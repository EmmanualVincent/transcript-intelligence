'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { avg, getWeekStart } = require('../src/lib/util');

test('avg: raw mean when decimals omitted', () => {
  assert.equal(avg([1, 2, 3]), 2);
  assert.equal(avg([1, 2]), 1.5);
});

test('avg: rounds to given decimals', () => {
  assert.equal(avg([1, 1, 2], 1), 1.3);
  assert.equal(avg([1, 2, 3], 0), 2);
});

test('avg: empty array is null', () => {
  assert.equal(avg([]), null);
});

test('getWeekStart: returns Monday of the week (UTC)', () => {
  assert.equal(getWeekStart('2024-01-03'), '2024-01-01'); // Wed -> Mon
  assert.equal(getWeekStart('2024-01-01'), '2024-01-01'); // Mon -> same
});

test('getWeekStart: Sunday rolls back to previous Monday', () => {
  assert.equal(getWeekStart('2024-01-07'), '2024-01-01');
});

test('getWeekStart: null in, null out', () => {
  assert.equal(getWeekStart(null), null);
});
