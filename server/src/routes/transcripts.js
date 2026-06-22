'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');

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

// Match a speaker name to a participant email to determine rep vs customer role.
// Uses a 4-char prefix match on name parts against the email local part.
function inferRole(speakerName, allEmails) {
  if (!speakerName || !allEmails?.length) return null;
  const nameParts = speakerName.toLowerCase().split(/\s+/).filter(p => p.length >= 2);
  for (const email of allEmails) {
    const local = email.split('@')[0].toLowerCase().replace(/[._-]/g, '');
    const matched = nameParts.some(p => local.includes(p.slice(0, 4)));
    if (matched) return email.includes('@aegiscloud.com') ? 'rep' : 'customer';
  }
  return null;
}

router.get('/:id', (req, res) => {
  const { transcripts } = getStore();
  const t = transcripts.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Transcript not found' });

  const utterances = t.utterances || [];

  // Speaker talk-time stats (base pass)
  const speakerStats = {};
  for (const u of utterances) {
    const sp = u.speaker_name || u.speaker || 'Unknown';
    if (!speakerStats[sp]) speakerStats[sp] = { utteranceCount: 0, totalDuration: 0, sentiments: [], questionCount: 0 };
    speakerStats[sp].utteranceCount++;
    speakerStats[sp].totalDuration += (u.endTime || 0) - (u.time || 0);
    if (u.sentimentType) speakerStats[sp].sentiments.push(u.sentimentType);
    if (u.sentence && u.sentence.trim().endsWith('?')) speakerStats[sp].questionCount++;
  }

  // Longest uninterrupted monologue per speaker (consecutive utterance runs)
  let curSpeaker = null;
  let curStreak = 0;
  for (const u of utterances) {
    const sp = u.speaker_name || u.speaker || 'Unknown';
    const dur = (u.endTime || 0) - (u.time || 0);
    if (sp === curSpeaker) {
      curStreak += dur;
    } else {
      if (curSpeaker !== null) {
        speakerStats[curSpeaker].longestMonologue = Math.max(speakerStats[curSpeaker].longestMonologue || 0, curStreak);
      }
      curSpeaker = sp;
      curStreak = dur;
    }
  }
  if (curSpeaker !== null) {
    speakerStats[curSpeaker].longestMonologue = Math.max(speakerStats[curSpeaker].longestMonologue || 0, curStreak);
  }

  // Speaker roles and speaker-switch count
  let speakerSwitches = 0;
  let prevSpeaker = null;
  for (const u of utterances) {
    const sp = u.speaker_name || u.speaker || 'Unknown';
    if (prevSpeaker !== null && sp !== prevSpeaker) speakerSwitches++;
    prevSpeaker = sp;
  }

  for (const name of Object.keys(speakerStats)) {
    speakerStats[name].longestMonologue = speakerStats[name].longestMonologue || 0;
    speakerStats[name].role = inferRole(name, t.allEmails);
  }

  // Conversation-level metrics
  const durationMins = t.duration || 0;
  const totalQuestions = Object.values(speakerStats).reduce((s, sp) => s + sp.questionCount, 0);
  const totalTalkTime = Object.values(speakerStats).reduce((s, sp) => s + sp.totalDuration, 0);
  const repTalkTime = Object.values(speakerStats).filter(sp => sp.role === 'rep').reduce((s, sp) => s + sp.totalDuration, 0);

  const conversationMetrics = {
    speakerSwitches,
    speakerSwitchesPer5Min: durationMins > 0 ? speakerSwitches / (durationMins / 5) : 0,
    totalQuestions,
    questionRatePerHour: durationMins > 0 ? totalQuestions / (durationMins / 60) : 0,
    repTalkPct: totalTalkTime > 0 ? (repTalkTime / totalTalkTime) * 100 : null,
  };

  res.json({ ...t, speakerStats, conversationMetrics });
});

module.exports = router;
