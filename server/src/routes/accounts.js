'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');

const router = Router();

// GET /api/accounts
router.get('/', (req, res) => {
  const { accounts } = getStore();

  let results = accounts;

  const { riskLevel, sort } = req.query;

  if (riskLevel) {
    results = results.filter(a => a.riskLevel === riskLevel);
  }

  // Sort (default is already by riskScore desc from computeAccountHealth)
  if (sort === 'name') {
    results = [...results].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'lastCall') {
    results = [...results].sort((a, b) => (b.lastCallDate || '').localeCompare(a.lastCallDate || ''));
  } else if (sort === 'sentiment') {
    results = [...results].sort((a, b) => (a.avgSentimentScore || 5) - (b.avgSentimentScore || 5));
  }

  res.json({ accounts: results, total: results.length });
});

// GET /api/accounts/:name
router.get('/:name', (req, res) => {
  const { accounts, transcripts } = getStore();

  const name = decodeURIComponent(req.params.name);
  const account = accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
  if (!account) return res.status(404).json({ error: 'Account not found' });

  // Join full transcript summaries (without utterances for response size)
  const accountTranscripts = transcripts
    .filter(t => account.transcriptIds.includes(t.id))
    .map(({ utterances, ...t }) => t)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // All key moments across this account's calls
  const allKeyMoments = accountTranscripts.flatMap(t =>
    (t.keyMoments || []).map(km => ({ ...km, transcriptId: t.id, transcriptTitle: t.title }))
  );

  // Risk score breakdown for explanation
  const scoreBreakdown = buildScoreBreakdown(account);

  res.json({
    ...account,
    transcripts: accountTranscripts,
    allKeyMoments,
    scoreBreakdown,
  });
});

function buildScoreBreakdown(account) {
  const parts = [];

  if (account.churnSignalCount >= 3) parts.push({ label: 'Churn signals (3+)', points: 40 });
  else if (account.churnSignalCount === 2) parts.push({ label: 'Churn signals (2)', points: 25 });
  else if (account.churnSignalCount === 1) parts.push({ label: 'Churn signal (1)', points: 15 });

  const s = account.avgSentimentScore;
  if (s != null) {
    if (s < 2.0) parts.push({ label: 'Very low sentiment (< 2.0)', points: 20 });
    else if (s < 2.5) parts.push({ label: 'Low sentiment (< 2.5)', points: 15 });
    else if (s < 3.0) parts.push({ label: 'Below-avg sentiment (< 3.0)', points: 10 });
  }

  if (account.competitorMentions >= 2) parts.push({ label: 'Multiple competitor evaluations', points: 25 });
  else if (account.competitorMentions === 1) parts.push({ label: 'Competitor evaluation', points: 15 });

  if (account.hasUpcomingRenewal) parts.push({ label: 'Upcoming renewal', points: 10 });
  if (account.featureGapCount >= 3) parts.push({ label: 'Feature gaps (3+)', points: 5 });
  if (account.praiseCount >= 2) parts.push({ label: 'Positive signals (praise)', points: -5 });

  return parts;
}

module.exports = router;
