'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');
const { avg, getWeekStart } = require('../lib/util');

const router = Router();

// GET /api/syncs
router.get('/', (req, res) => {
  const { transcripts } = getStore();
  const internal = transcripts.filter(t => t.callType === 'internal');

  // Stat counts
  const avgSentiment = avg(internal.map(t => t.sentimentScore).filter(s => s != null), 2);
  const allActionItems = internal.flatMap(t => t.actionItems || []);
  const allKeyMoments = internal.flatMap(t =>
    (t.keyMoments || []).map(m => ({ ...m, transcriptId: t.id, transcriptTitle: t.title, date: t.startTime?.slice(0, 10) }))
  );
  const blockers = allKeyMoments.filter(m => m.type === 'concern' || m.type === 'technical_issue');

  // Recurring topics — count frequency across syncs
  const topicMap = {};
  for (const t of internal) {
    for (const topic of t.topics || []) {
      if (!topicMap[topic]) topicMap[topic] = { count: 0, examples: [] };
      topicMap[topic].count++;
      if (topicMap[topic].examples.length < 2) {
        topicMap[topic].examples.push({ id: t.id, title: t.title, date: t.startTime?.slice(0, 10) });
      }
    }
  }
  const recurringTopics = Object.entries(topicMap)
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 12)
    .map(([topic, v]) => ({ topic, count: v.count, examples: v.examples }));

  // Category breakdown
  const categoryBreakdown = {};
  for (const t of internal) {
    categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + 1;
  }

  // Participant frequency
  const speakerFreq = {};
  for (const t of internal) {
    for (const s of t.speakers || []) {
      const name = s.name || s;
      if (!name) continue;
      speakerFreq[name] = (speakerFreq[name] || 0) + 1;
    }
  }
  const topParticipants = Object.entries(speakerFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Sentiment timeline (internal only, weekly)
  const weekMap = {};
  for (const t of internal) {
    if (!t.startTime || t.sentimentScore == null) continue;
    const week = getWeekStart(t.startTime);
    if (!weekMap[week]) weekMap[week] = [];
    weekMap[week].push(t.sentimentScore);
  }
  const sentimentTimeline = Object.keys(weekMap).sort().map(week => ({
    weekStart: week,
    avgScore: avg(weekMap[week], 2),
    count: weekMap[week].length,
  }));

  // Sync list (light — no utterances)
  const syncs = internal.map(t => ({
    id: t.id,
    title: t.title,
    date: t.startTime?.slice(0, 10),
    category: t.category,
    sentimentScore: t.sentimentScore,
    overallSentiment: t.overallSentiment,
    topics: t.topics || [],
    speakerCount: (t.speakers || []).length,
    actionItemCount: (t.actionItems || []).length,
    concernCount: (t.keyMoments || []).filter(m => m.type === 'concern' || m.type === 'technical_issue').length,
  }));

  res.json({
    total: internal.length,
    avgSentiment,
    concernCount: blockers.length,
    actionItemCount: allActionItems.length,
    categoryBreakdown,
    recurringTopics,
    blockers: blockers.slice(0, 20),
    topParticipants,
    sentimentTimeline,
    syncs,
  });
});

module.exports = router;
