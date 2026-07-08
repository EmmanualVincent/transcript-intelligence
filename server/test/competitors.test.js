'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractCompetitors } = require('../src/lib/competitors');

test('finds competitor mentioned in summary text', () => {
  const out = extractCompetitors([
    {
      id: 't1', title: 'Call', callType: 'external', customerAccount: 'Acme',
      sentimentScore: 3, summary: 'Customer is evaluating Wiz as an alternative',
      keyMoments: [], utterances: [],
    },
  ]);
  const wiz = out.find(c => c.name === 'Wiz');
  assert.ok(wiz, 'Wiz should be detected');
  assert.equal(wiz.mentionCount, 1);
  assert.deepEqual(wiz.affectedAccounts, ['Acme']);
  assert.equal(wiz.avgSentimentAtMention, 3);
});

test('unmentioned competitors are dropped from results', () => {
  const out = extractCompetitors([
    { id: 't1', callType: 'external', summary: 'no vendors here', keyMoments: [], utterances: [] },
  ]);
  assert.equal(out.length, 0);
});

test('results sorted by mention count descending', () => {
  const out = extractCompetitors([
    { id: 't1', callType: 'external', summary: 'Wiz Wiz', keyMoments: [], utterances: [{ sentence: 'Wiz again' }] },
    { id: 't2', callType: 'external', summary: 'Splunk', keyMoments: [], utterances: [] },
  ]);
  assert.equal(out[0].name, 'Wiz');
  assert.ok(out[0].mentionCount >= out[out.length - 1].mentionCount);
});
