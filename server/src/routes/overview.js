'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');

const router = Router();

router.get('/', (req, res) => {
  const { transcripts, accounts, competitors } = getStore();

  // Call type breakdown
  const callTypeBreakdown = { internal: 0, external: 0, support: 0 };
  const categoryBreakdown = {};
  const sentimentByCallType = { internal: [], external: [], support: [] };
  let totalChurnSignals = 0;
  let totalFeatureGaps = 0;
  let totalPraise = 0;

  for (const t of transcripts) {
    callTypeBreakdown[t.callType] = (callTypeBreakdown[t.callType] || 0) + 1;
    categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + 1;

    if (t.sentimentScore != null) {
      sentimentByCallType[t.callType].push(t.sentimentScore);
    }

    for (const km of t.keyMoments || []) {
      if (km.type === 'churn_signal') totalChurnSignals++;
      if (km.type === 'feature_gap') totalFeatureGaps++;
      if (km.type === 'praise') totalPraise++;
    }
  }

  const avg = arr => arr.length ? Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10 : null;

  const avgSentimentByCallType = {
    internal: avg(sentimentByCallType.internal),
    external: avg(sentimentByCallType.external),
    support: avg(sentimentByCallType.support),
  };

  const criticalAccounts = accounts.filter(a => a.riskLevel === 'critical');
  const highRiskAccounts = accounts.filter(a => a.riskLevel === 'high');

  const dates = transcripts.map(t => t.startTime).filter(Boolean).sort();

  res.json({
    totalTranscripts: transcripts.length,
    callTypeBreakdown,
    categoryBreakdown,
    avgSentimentByCallType,
    overallAvgSentiment: avg([...sentimentByCallType.internal, ...sentimentByCallType.external, ...sentimentByCallType.support]),
    totalChurnSignals,
    totalFeatureGaps,
    totalPraise,
    totalAccounts: accounts.length,
    criticalAccounts: criticalAccounts.length,
    highRiskAccounts: highRiskAccounts.length,
    topAtRiskAccounts: criticalAccounts.slice(0, 5).map(a => ({
      name: a.name,
      riskScore: a.riskScore,
      riskLevel: a.riskLevel,
      churnSignalCount: a.churnSignalCount,
      competitors: a.competitors,
    })),
    competitorsDetected: competitors.map(c => c.name),
    topCompetitor: competitors[0] || null,
    dateRange: {
      start: dates[0] ? dates[0].slice(0, 10) : null,
      end: dates[dates.length - 1] ? dates[dates.length - 1].slice(0, 10) : null,
    },
  });
});

module.exports = router;
