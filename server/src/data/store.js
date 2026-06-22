'use strict';

const { loadTranscripts } = require('./loader');
const { computeAccountHealth } = require('../lib/accounts');
const { extractCompetitors } = require('../lib/competitors');

let _store = null;

function getStore() {
  if (_store) return _store;

  console.log('[store] initializing...');
  const transcripts = loadTranscripts();
  const accounts = computeAccountHealth(transcripts);
  const competitors = extractCompetitors(transcripts);

  console.log(`[store] ready — ${transcripts.length} transcripts, ${accounts.length} accounts, ${competitors.length} competitors`);

  _store = { transcripts, accounts, competitors };
  return _store;
}

module.exports = { getStore };
