'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');
const { KNOWN_COMPETITORS } = require('../lib/competitors');

const router = Router();

// Urgency tiers: an account is "Act Now" if renewal + churn + competitor all converge.
// "Act Soon" if any two converge. "Watch" if one high-intensity signal present.
function classifyTier(acc) {
  const hasRenewal = acc.hasUpcomingRenewal;
  const hasChurn   = acc.churnSignalCount >= 1;
  const hasComp    = acc.competitorMentions >= 1;
  const signals    = [hasRenewal, hasChurn, hasComp].filter(Boolean).length;

  if (signals === 3) return 'act_now';
  if (signals === 2) return 'act_soon';
  if (acc.riskLevel === 'critical' || (acc.riskLevel === 'high' && acc.churnSignalCount >= 2)) return 'watch';
  return null; // exclude from list
}

// Urgency score: higher = needs attention sooner
function urgencyScore(acc) {
  let score = acc.riskScore;
  if (acc.hasUpcomingRenewal) score += 20;
  if (acc.competitorMentions >= 2) score += 10;
  if (acc.avgSentimentScore != null && acc.avgSentimentScore < 2.5) score += 10;
  return score;
}

// GET /api/revenue-risk
router.get('/', (req, res) => {
  const { accounts, transcripts } = getStore();

  // Build a map from account name → churn signal texts + competitor context
  const churnTextsByAccount = {};
  const competitorContextByAccount = {};

  for (const t of transcripts) {
    if (!t.customerAccount) continue;
    const name = t.customerAccount;

    for (const km of t.keyMoments || []) {
      if (km.type === 'churn_signal') {
        if (!churnTextsByAccount[name]) churnTextsByAccount[name] = [];
        churnTextsByAccount[name].push({
          text: km.text,
          transcriptId: t.id,
          transcriptTitle: t.title,
          sentimentScore: t.sentimentScore,
          date: t.startTime ? t.startTime.slice(0, 10) : null,
        });
      }
    }

    // Competitor context: pull from summary sentences that name a competitor
    const summary = t.summary || '';
    if (!competitorContextByAccount[name]) competitorContextByAccount[name] = [];
    const lc = summary.toLowerCase();
    for (const comp of KNOWN_COMPETITORS) {
      if (lc.includes(comp.toLowerCase())) {
        competitorContextByAccount[name].push({ competitor: comp, transcriptId: t.id, date: t.startTime ? t.startTime.slice(0, 10) : null });
        break; // one entry per transcript
      }
    }
  }

  const results = accounts
    .map(acc => {
      const tier = classifyTier(acc);
      if (!tier) return null;

      const churnSignals = (churnTextsByAccount[acc.name] || [])
        .sort((a, b) => (a.sentimentScore || 5) - (b.sentimentScore || 5)) // worst sentiment first
        .slice(0, 2);

      const competitorContext = [...new Map(
        (competitorContextByAccount[acc.name] || []).map(c => [c.competitor, c])
      ).values()]; // dedupe by competitor name

      return {
        name: acc.name,
        riskScore: acc.riskScore,
        riskLevel: acc.riskLevel,
        tier,
        urgency: urgencyScore(acc),
        hasUpcomingRenewal: acc.hasUpcomingRenewal,
        churnSignalCount: acc.churnSignalCount,
        competitorMentions: acc.competitorMentions,
        competitors: acc.competitors,
        avgSentimentScore: acc.avgSentimentScore,
        featureGapCount: acc.featureGapCount,
        lastCallDate: acc.lastCallDate,
        transcriptCount: acc.transcriptCount,
        churnSignals,
        competitorContext,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Act now first, then act soon, then watch; within tier by urgency
      const tierOrder = { act_now: 0, act_soon: 1, watch: 2 };
      const td = tierOrder[a.tier] - tierOrder[b.tier];
      return td !== 0 ? td : b.urgency - a.urgency;
    });

  const tierCounts = { act_now: 0, act_soon: 0, watch: 0 };
  for (const r of results) tierCounts[r.tier]++;

  res.json({
    total: results.length,
    tierCounts,
    accounts: results,
  });
});

module.exports = router;
