'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');
const { computeCallMetrics } = require('../lib/talkMetrics');

const router = Router();

// Strip utterances for list view to keep responses light
function toListItem(t) {
  const { utterances, ...rest } = t;
  return rest;
}

router.get('/', (req, res) => {
  const { transcripts } = getStore();

  let results = transcripts;

  // Filters
  const { callType, category, account, sentiment, search } = req.query;

  if (callType) {
    results = results.filter(t => t.callType === callType);
  }

  if (category) {
    results = results.filter(t => t.category === category);
  }

  if (account) {
    const lc = account.toLowerCase();
    results = results.filter(t => t.customerAccount && t.customerAccount.toLowerCase().includes(lc));
  }

  if (sentiment) {
    // sentiment can be a label like "mixed-negative" or a range like "lt:3"
    if (sentiment.startsWith('lt:')) {
      const threshold = parseFloat(sentiment.slice(3));
      results = results.filter(t => t.sentimentScore != null && t.sentimentScore < threshold);
    } else if (sentiment.startsWith('gt:')) {
      const threshold = parseFloat(sentiment.slice(3));
      results = results.filter(t => t.sentimentScore != null && t.sentimentScore > threshold);
    } else {
      results = results.filter(t => t.overallSentiment === sentiment);
    }
  }

  if (search) {
    const lc = search.toLowerCase();
    results = results.filter(t =>
      t.title.toLowerCase().includes(lc) ||
      (t.summary || '').toLowerCase().includes(lc) ||
      (t.topics || []).some(tp => tp.toLowerCase().includes(lc)) ||
      (t.customerAccount || '').toLowerCase().includes(lc)
    );
  }

  // Pagination
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  const total = results.length;
  const paginated = results.slice((page - 1) * limit, page * limit);

  res.json({
    transcripts: paginated.map(toListItem),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

router.get('/:id', (req, res) => {
  const { transcripts } = getStore();
  const t = transcripts.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Transcript not found' });

  const { speakerStats, speakerSwitches, switchesPer5Min, totalQuestions, questionRatePerHour, repTalkPct } = computeCallMetrics(t);

  const conversationMetrics = {
    speakerSwitches,
    speakerSwitchesPer5Min: switchesPer5Min,
    totalQuestions,
    questionRatePerHour,
    repTalkPct,
  };

  res.json({ ...t, speakerStats, conversationMetrics });
});

module.exports = router;
