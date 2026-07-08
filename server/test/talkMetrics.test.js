'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeCallMetrics } = require('../src/lib/talkMetrics');

const transcript = {
  duration: 10,
  allEmails: ['john.rep@aegiscloud.com', 'jane@customer.com'],
  utterances: [
    { speaker_name: 'John Rep', time: 0, endTime: 30, sentence: 'How are you?', sentimentType: 'positive' },
    { speaker_name: 'Jane Cust', time: 30, endTime: 60, sentence: 'Good.' },
    { speaker_name: 'John Rep', time: 60, endTime: 90, sentence: 'Great to hear.' },
  ],
};

test('infers rep vs customer roles from emails', () => {
  const m = computeCallMetrics(transcript);
  assert.equal(m.speakerStats['John Rep'].role, 'rep');
  assert.equal(m.speakerStats['Jane Cust'].role, 'customer');
});

test('counts speaker switches and questions', () => {
  const m = computeCallMetrics(transcript);
  assert.equal(m.speakerSwitches, 2);
  assert.equal(m.totalQuestions, 1);
});

test('rep talk percentage of total talk time', () => {
  const m = computeCallMetrics(transcript);
  // rep talks 60s of 90s total
  assert.ok(Math.abs(m.repTalkPct - 66.6667) < 0.01);
});

test('empty transcript does not throw and yields null rep pct', () => {
  const m = computeCallMetrics({ utterances: [], duration: 0 });
  assert.equal(m.repTalkPct, null);
  assert.equal(m.speakerSwitches, 0);
});
