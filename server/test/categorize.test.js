'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { categorize } = require('../src/lib/categorize');

const internalEmails = ['a@aegiscloud.com', 'b@aegiscloud.com'];
const mixedEmails = ['rep@aegiscloud.com', 'buyer@globex.com'];

test('internal call: all attendees are internal', () => {
  const r = categorize({ title: 'Weekly Standup', allEmails: internalEmails }, {});
  assert.equal(r.callType, 'internal');
});

test('support call: title + external attendee', () => {
  const r = categorize({ title: 'Support Case #1234 - Acme SSO issue', allEmails: mixedEmails }, {});
  assert.equal(r.callType, 'support');
  assert.equal(r.category, 'support');
  assert.equal(r.customerAccount, 'Acme');
});

test('external renewal: account parsed from "Aegis / X" title', () => {
  const r = categorize({ title: 'Aegis / Globex - Renewal planning', allEmails: mixedEmails }, {});
  assert.equal(r.callType, 'external');
  assert.equal(r.category, 'renewal');
  assert.equal(r.customerAccount, 'Globex');
});

test('incident category wins over other keywords', () => {
  const r = categorize({ title: 'Aegis / Initech - Service Outage War Room', allEmails: mixedEmails }, {});
  assert.equal(r.category, 'incident');
  assert.equal(r.customerAccount, 'Initech');
});

test('compliance category from summary topics', () => {
  const r = categorize(
    { title: 'Aegis / Umbrella - Security Review', allEmails: mixedEmails },
    { topics: ['SOC 2'] },
  );
  assert.equal(r.category, 'compliance');
});
