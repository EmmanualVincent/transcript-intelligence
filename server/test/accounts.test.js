'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeAccountHealth, riskByAccountName } = require('../src/lib/accounts');

// 2 churn signals (+25) + sentiment 1.5 (+20) + 1 competitor mention (+15)
// + upcoming renewal (+10) = 70 -> "high"
const transcripts = [
  {
    id: 't1', customerAccount: 'Acme', callType: 'external', category: 'renewal',
    sentimentScore: 1.5, topics: ['churn risk'], summary: 'considering Wiz',
    startTime: '2024-05-01T10:00:00Z',
    keyMoments: [
      { type: 'churn_signal', text: 'may leave us' },
      { type: 'churn_signal', text: 'very unhappy' },
      { type: 'competitor', text: 'looking at CrowdStrike' },
    ],
  },
];

test('computes additive risk score and level', () => {
  const [acme] = computeAccountHealth(transcripts);
  assert.equal(acme.name, 'Acme');
  assert.equal(acme.riskScore, 70);
  assert.equal(acme.riskLevel, 'high');
  assert.equal(acme.hasUpcomingRenewal, true);
});

test('collects competitors from both key moments and summary', () => {
  const [acme] = computeAccountHealth(transcripts);
  assert.ok(acme.competitors.includes('CrowdStrike'));
  assert.ok(acme.competitors.includes('Wiz'));
});

test('internal calls (no customerAccount) are ignored', () => {
  const out = computeAccountHealth([{ id: 'x', callType: 'internal', keyMoments: [] }]);
  assert.equal(out.length, 0);
});

test('riskByAccountName builds a lookup map', () => {
  const accounts = computeAccountHealth(transcripts);
  const map = riskByAccountName(accounts);
  assert.equal(map['Acme'].riskLevel, 'high');
  assert.equal(map['Acme'].riskScore, 70);
});
