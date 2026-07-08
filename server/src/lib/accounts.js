'use strict';

const KNOWN_COMPETITORS = require('./competitors').KNOWN_COMPETITORS;
const { avg } = require('./util');

// Topics that count as a churn/risk concern when they show up on a call.
// Matched case-insensitively against transcript.topics.
const CHURN_TOPICS = new Set([
  'churn risk', 'competitive threat', 'sla breach', 'service outage',
  'outage', 'platform outage', 'vendor review', 'competitive displacement',
  'churn signal', 'incident escalation',
]);

// Roll every transcript up to its customer account, then score each account's
// churn risk. Returns accounts sorted highest-risk first.
function computeAccountHealth(transcripts) {
  const map = {}; // account name -> running accumulator

  for (const t of transcripts) {
    if (!t.customerAccount) continue; // internal calls have no account to attribute

    const name = t.customerAccount;
    if (!map[name]) {
      // First time we see this account: seed the accumulator.
      map[name] = {
        name,
        transcriptIds: [],
        sentimentScores: [],
        churnSignalCount: 0,
        competitorMentions: 0,
        featureGapCount: 0,
        praiseCount: 0,
        hasUpcomingRenewal: false,
        competitors: new Set(),
        topConcerns: new Set(),
        callTypes: { internal: 0, external: 0, support: 0 },
        lastCallDate: null,
      };
    }

    const acc = map[name];
    acc.transcriptIds.push(t.id);
    acc.callTypes[t.callType] = (acc.callTypes[t.callType] || 0) + 1;

    if (t.sentimentScore != null) acc.sentimentScores.push(t.sentimentScore);

    if (t.category === 'renewal') acc.hasUpcomingRenewal = true;

    // Key moment signals
    for (const km of t.keyMoments || []) {
      if (km.type === 'churn_signal') acc.churnSignalCount++;
      if (km.type === 'feature_gap') acc.featureGapCount++;
      if (km.type === 'praise') acc.praiseCount++;

      const text = (km.text || '').toLowerCase();
      for (const comp of KNOWN_COMPETITORS) {
        if (text.includes(comp.toLowerCase())) {
          acc.competitorMentions++;
          acc.competitors.add(comp);
        }
      }
    }

    // Summary text competitor scan (catches mentions not in key moments)
    const summaryText = (t.summary || '').toLowerCase();
    for (const comp of KNOWN_COMPETITORS) {
      if (summaryText.includes(comp.toLowerCase())) {
        acc.competitors.add(comp);
      }
    }

    // Topic-based concerns
    for (const topic of t.topics || []) {
      if (CHURN_TOPICS.has(topic.toLowerCase())) {
        acc.topConcerns.add(topic);
      }
    }

    if (!acc.lastCallDate || (t.startTime || '') > acc.lastCallDate) {
      acc.lastCallDate = t.startTime || null;
    }
  }

  // Second pass: turn each accumulator into a scored, serializable account.
  return Object.values(map).map(acc => {
    const avgSentimentScore = avg(acc.sentimentScores, 1);

    // Additive risk model: each signal contributes points, capped at 100.
    let riskScore = 0;

    // Churn signals (strongest predictor)
    if (acc.churnSignalCount >= 3) riskScore += 40;
    else if (acc.churnSignalCount === 2) riskScore += 25;
    else if (acc.churnSignalCount === 1) riskScore += 15;

    // Low sentiment
    if (avgSentimentScore != null) {
      if (avgSentimentScore < 2.0) riskScore += 20;
      else if (avgSentimentScore < 2.5) riskScore += 15;
      else if (avgSentimentScore < 3.0) riskScore += 10;
    }

    // Competitor evaluation (late-stage warning)
    if (acc.competitorMentions >= 2) riskScore += 25;
    else if (acc.competitorMentions === 1) riskScore += 15;

    // Renewal urgency adds pressure
    if (acc.hasUpcomingRenewal) riskScore += 10;

    // Feature gaps signal unmet needs
    if (acc.featureGapCount >= 3) riskScore += 5;

    // Positive signals slightly reduce risk
    if (acc.praiseCount >= 2) riskScore = Math.max(0, riskScore - 5);

    riskScore = Math.min(riskScore, 100);

    let riskLevel;
    if (riskScore >= 80) riskLevel = 'critical';
    else if (riskScore >= 60) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      name: acc.name,
      riskScore,
      riskLevel,
      transcriptCount: acc.transcriptIds.length,
      avgSentimentScore,
      churnSignalCount: acc.churnSignalCount,
      competitorMentions: acc.competitorMentions,
      featureGapCount: acc.featureGapCount,
      praiseCount: acc.praiseCount,
      hasUpcomingRenewal: acc.hasUpcomingRenewal,
      lastCallDate: acc.lastCallDate ? acc.lastCallDate.slice(0, 10) : null,
      transcriptIds: acc.transcriptIds,
      competitors: [...acc.competitors],
      topConcerns: [...acc.topConcerns],
      callTypes: acc.callTypes,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

// name -> { riskLevel, riskScore } lookup, used by routes that annotate
// per-transcript or per-owner data with the parent account's risk.
function riskByAccountName(accounts) {
  const map = {};
  for (const a of accounts) {
    map[a.name] = { riskLevel: a.riskLevel, riskScore: a.riskScore };
  }
  return map;
}

module.exports = { computeAccountHealth, riskByAccountName };
