'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');

const router = Router();

const SENTIMENT_ORDER = ['very-negative', 'negative', 'mixed-negative', 'mixed-positive', 'positive', 'very-positive'];

function getWeekStart(dateStr) {
  const d = new Date(dateStr);
  const day = d.getUTCDay(); // 0 = Sun
  const offset = day === 0 ? -6 : 1 - day; // shift to Monday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + offset);
  return monday.toISOString().slice(0, 10);
}

function avg(arr) {
  if (!arr.length) return null;
  return Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 100) / 100;
}

// GET /api/sentiment/timeline
router.get('/timeline', (req, res) => {
  const { transcripts } = getStore();

  const weekMap = {};

  for (const t of transcripts) {
    if (!t.startTime || t.sentimentScore == null) continue;
    const week = getWeekStart(t.startTime);
    if (!weekMap[week]) {
      weekMap[week] = {
        weekStart: week,
        scores: [],
        byCallType: { internal: [], external: [], support: [] },
      };
    }
    weekMap[week].scores.push(t.sentimentScore);
    weekMap[week].byCallType[t.callType].push(t.sentimentScore);
  }

  const weeks = Object.keys(weekMap)
    .sort()
    .map(week => {
      const w = weekMap[week];
      return {
        weekStart: w.weekStart,
        avgScore: avg(w.scores),
        transcriptCount: w.scores.length,
        byCallType: {
          internal: avg(w.byCallType.internal),
          external: avg(w.byCallType.external),
          support: avg(w.byCallType.support),
        },
      };
    });

  res.json({ weeks });
});

// GET /api/sentiment/by-category
router.get('/by-category', (req, res) => {
  const { transcripts } = getStore();

  const categoryScores = {};
  const callTypeScores = { internal: [], external: [], support: [] };
  const distributionCount = {};

  for (const t of transcripts) {
    if (t.sentimentScore == null) continue;

    // By category
    if (!categoryScores[t.category]) categoryScores[t.category] = [];
    categoryScores[t.category].push(t.sentimentScore);

    // By call type
    callTypeScores[t.callType].push(t.sentimentScore);

    // Sentiment label distribution
    if (t.overallSentiment) {
      distributionCount[t.overallSentiment] = (distributionCount[t.overallSentiment] || 0) + 1;
    }
  }

  const byCategory = Object.fromEntries(
    Object.entries(categoryScores).map(([cat, scores]) => [cat, avg(scores)])
  );

  const byCallType = {
    internal: avg(callTypeScores.internal),
    external: avg(callTypeScores.external),
    support: avg(callTypeScores.support),
  };

  const distribution = SENTIMENT_ORDER
    .filter(label => distributionCount[label])
    .map(label => ({ label, count: distributionCount[label] || 0 }));

  res.json({ byCategory, byCallType, distribution });
});

// GET /api/sentiment/by-topic
router.get('/by-topic', (req, res) => {
  const { transcripts } = getStore();

  const topicData = {};

  for (const t of transcripts) {
    if (t.sentimentScore == null) continue;
    for (const topic of t.topics || []) {
      if (!topicData[topic]) topicData[topic] = { scores: [], callTypes: new Set() };
      topicData[topic].scores.push(t.sentimentScore);
      topicData[topic].callTypes.add(t.callType);
    }
  }

  const topics = Object.entries(topicData)
    .map(([topic, data]) => ({
      topic,
      avgSentiment: avg(data.scores),
      count: data.scores.length,
      callTypes: [...data.callTypes],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  res.json({ topics });
});

// GET /api/sentiment/divergence
// Surfaces accounts where external call sentiment > support call sentiment (AM under-reporting)
router.get('/divergence', (req, res) => {
  const { transcripts } = getStore();

  const accountData = {};

  for (const t of transcripts) {
    if (!t.customerAccount || t.sentimentScore == null) continue;
    if (!accountData[t.customerAccount]) {
      accountData[t.customerAccount] = { external: [], support: [] };
    }
    if (t.callType === 'external') accountData[t.customerAccount].external.push(t.sentimentScore);
    if (t.callType === 'support') accountData[t.customerAccount].support.push(t.sentimentScore);
  }

  const divergent = Object.entries(accountData)
    .filter(([, d]) => d.external.length > 0 && d.support.length > 0)
    .map(([account, d]) => {
      const extAvg = avg(d.external);
      const supAvg = avg(d.support);
      return {
        account,
        externalAvg: extAvg,
        supportAvg: supAvg,
        divergence: Math.round((extAvg - supAvg) * 100) / 100,
      };
    })
    .filter(d => d.divergence > 0.3)
    .sort((a, b) => b.divergence - a.divergence);

  res.json({ divergent });
});

module.exports = router;
