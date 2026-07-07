'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');
const { computeCallMetrics } = require('../lib/talkMetrics');
const { avg, getWeekStart } = require('../lib/util');

const router = Router();

function emailToName(email) {
  const local = email.split('@')[0];
  return local.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function weekLabel(weekStart) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(weekStart + 'T00:00:00Z');
  return `${months[d.getUTCMonth()]} W${Math.ceil(d.getUTCDate() / 7)}`;
}

// Flag threshold: what % rep talk is "too much" for each call type
function talkThreshold(callType) {
  return callType === 'support' ? 50 : 60;
}

function computeTrendDirection(history) {
  if (history.length < 4) return 'stable';
  const half = Math.ceil(history.length / 2);
  const recent = history.slice(-half);
  const prev = history.slice(0, -half);
  if (prev.length === 0) return 'stable';
  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const prevAvg = prev.reduce((s, v) => s + v, 0) / prev.length;
  if (recentAvg - prevAvg > 0.25) return 'improving';
  if (prevAvg - recentAvg > 0.25) return 'declining';
  return 'stable';
}

router.get('/', (req, res) => {
  const { transcripts } = getStore();

  // All customer-facing calls
  const calls = transcripts
    .filter(t => t.callType === 'external' || t.callType === 'support')
    .map(t => ({ ...t, metrics: computeCallMetrics(t) }));

  // ── Aggregate summary ──────────────────────────────────────────────────────
  const totalCalls = calls.length;
  const callTypeCounts = calls.reduce((acc, t) => {
    acc[t.callType] = (acc[t.callType] || 0) + 1;
    return acc;
  }, {});

  const withSentiment = calls.filter(t => t.sentimentScore != null);
  const withTalkPct   = calls.filter(t => t.metrics.repTalkPct != null);

  const callsWithinTarget = withTalkPct.filter(t =>
    t.metrics.repTalkPct <= talkThreshold(t.callType)
  ).length;

  const startDates = calls.map(t => t.startTime).filter(Boolean).sort();

  // Repeat contacts: accounts with more than one customer-facing call
  const acctCallCounts = {};
  for (const t of calls) {
    if (t.customerAccount) acctCallCounts[t.customerAccount] = (acctCallCounts[t.customerAccount] || 0) + 1;
  }
  const repeatAccounts = Object.entries(acctCallCounts)
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([account, count]) => ({ account, count }));

  const summary = {
    totalCalls,
    callTypeCounts,
    dateRange: startDates.length ? {
      start: new Date(startDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      end:   new Date(startDates[startDates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    } : null,
    avgSentiment:           avg(withSentiment.map(t => t.sentimentScore)),
    avgRepTalkPct:          avg(withTalkPct.map(t => t.metrics.repTalkPct)),
    avgQuestionRatePerHour: avg(calls.map(t => t.metrics.questionRatePerHour)),
    avgSwitchesPer5Min:     avg(calls.map(t => t.metrics.switchesPer5Min)),
    avgDurationMins:        avg(calls.map(t => t.duration || 0)),
    callsWithinTarget,
    pctWithinTarget: withTalkPct.length ? (callsWithinTarget / withTalkPct.length) * 100 : null,
    repeatContactCount: repeatAccounts.length,
    repeatContactAccounts: repeatAccounts.slice(0, 8),
  };

  // ── Weekly trend ──────────────────────────────────────────────────────────
  const weekBuckets = {};
  for (const t of calls) {
    const ws = getWeekStart(t.startTime);
    if (!ws) continue;
    if (!weekBuckets[ws]) weekBuckets[ws] = { sentiments: [], talkPcts: [], qRates: [], durations: [], switches: [] };
    const b = weekBuckets[ws];
    if (t.sentimentScore != null) b.sentiments.push(t.sentimentScore);
    if (t.metrics.repTalkPct != null) b.talkPcts.push(t.metrics.repTalkPct);
    b.qRates.push(t.metrics.questionRatePerHour);
    b.durations.push(t.duration || 0);
    b.switches.push(t.metrics.switchesPer5Min);
  }

  const weeklyTrend = Object.entries(weekBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ws, b]) => ({
      weekStart: ws,
      label: weekLabel(ws),
      callCount: b.sentiments.length || b.qRates.length,
      avgSentiment:   avg(b.sentiments),
      avgRepTalkPct:  avg(b.talkPcts),
      avgQRate:       avg(b.qRates),
      avgDuration:    avg(b.durations),
      avgSwitches:    avg(b.switches),
    }));

  // ── Distributions ─────────────────────────────────────────────────────────
  const talkBuckets = { '<40%': 0, '40-50%': 0, '50-60%': 0, '60-70%': 0, '>70%': 0 };
  for (const t of withTalkPct) {
    const p = t.metrics.repTalkPct;
    if (p < 40)      talkBuckets['<40%']++;
    else if (p < 50) talkBuckets['40-50%']++;
    else if (p < 60) talkBuckets['50-60%']++;
    else if (p < 70) talkBuckets['60-70%']++;
    else             talkBuckets['>70%']++;
  }

  const durBuckets = { '<15m': 0, '15-25m': 0, '25-35m': 0, '>35m': 0 };
  for (const t of calls) {
    const d = t.duration || 0;
    if (d < 15)      durBuckets['<15m']++;
    else if (d < 25) durBuckets['15-25m']++;
    else if (d < 35) durBuckets['25-35m']++;
    else             durBuckets['>35m']++;
  }

  const qBuckets = { '<10/hr': 0, '10-18/hr': 0, '18-25/hr': 0, '>25/hr': 0 };
  for (const t of calls) {
    const q = t.metrics.questionRatePerHour;
    if (q < 10)      qBuckets['<10/hr']++;
    else if (q < 18) qBuckets['10-18/hr']++;
    else if (q < 25) qBuckets['18-25/hr']++;
    else             qBuckets['>25/hr']++;
  }

  // ── Per-rep analytics ─────────────────────────────────────────────────────
  const repMap = {};
  for (const t of calls) {
    const email = t.organizerEmail;
    if (!email || !email.includes('@aegiscloud.com')) continue;
    if (!repMap[email]) repMap[email] = { email, calls: [] };
    repMap[email].calls.push(t);
  }

  const byRep = Object.values(repMap).map(({ email, calls: repCalls }) => {
    const sorted = repCalls.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const validSent  = sorted.filter(t => t.sentimentScore != null);
    const validTalk  = sorted.filter(t => t.metrics.repTalkPct != null);
    const sentHistory = validSent.map(t => t.sentimentScore);

    const callsOverThreshold = validTalk.filter(t =>
      t.metrics.repTalkPct > talkThreshold(t.callType)
    ).length;

    return {
      name:                   emailToName(email),
      email,
      callCount:              sorted.length,
      avgSentiment:           avg(validSent.map(t => t.sentimentScore)),
      avgRepTalkPct:          avg(validTalk.map(t => t.metrics.repTalkPct)),
      avgQuestionRatePerHour: avg(sorted.map(t => t.metrics.questionRatePerHour)),
      avgSwitchesPer5Min:     avg(sorted.map(t => t.metrics.switchesPer5Min)),
      avgDurationMins:        avg(sorted.map(t => t.duration || 0)),
      callsOverThreshold,
      trendDirection:         computeTrendDirection(sentHistory),
      sentimentHistory:       sentHistory,
      recentCalls: sorted.slice(-10).reverse().map(t => ({
        id:                   t.id,
        title:                t.title,
        date:                 t.startTime,
        sentimentScore:       t.sentimentScore,
        repTalkPct:           t.metrics.repTalkPct,
        questionRatePerHour:  t.metrics.questionRatePerHour,
        switchesPer5Min:      t.metrics.switchesPer5Min,
        durationMins:         t.duration,
        callType:             t.callType,
        customerAccount:      t.customerAccount,
      })),
    };
  }).sort((a, b) => b.callCount - a.callCount);

  res.json({
    summary,
    weeklyTrend,
    talkRatioDistribution: Object.entries(talkBuckets).map(([label, count]) => ({ label, count })),
    durationDistribution:  Object.entries(durBuckets).map(([label, count]) => ({ label, count })),
    qRateDistribution:     Object.entries(qBuckets).map(([label, count]) => ({ label, count })),
    byRep,
  });
});

module.exports = router;
