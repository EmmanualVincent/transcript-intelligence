'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');
const { riskByAccountName } = require('../lib/accounts');

const router = Router();

const SIGNAL_TYPES = ['feature_gap', 'concern', 'technical_issue'];
const PRAISE_TYPES = ['praise'];

function inferProductArea(text) {
  const t = text.toLowerCase();
  if (/scim|mfa|sso|identity|saml|ldap|provisioning|okta|entra|active directory|iam|privileged access|session timeout|role.based/.test(t)) return 'Identity';
  if (/comply|compliance report|soc 2|hipaa|iso|pci|cmmc|audit report|multi.framework|report format/.test(t)) return 'Comply';
  if (/detect|alert|threat|detection|deduplication|false positive|latency|pipeline|monitoring/.test(t)) return 'Detect';
  if (/backup|restore|protect|recovery|s3|ebs|granular restore|rto|cloudprime/.test(t)) return 'Protect';
  if (/logvault|siem|log ingestion|log pipeline/.test(t)) return 'LogVault';
  return 'Platform';
}

// GET /api/features
router.get('/', (req, res) => {
  const { transcripts, accounts } = getStore();

  const riskByAccount = riskByAccountName(accounts);

  const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

  // Collect all customer-raised signals
  // feature_gap/concern/technical_issue: external calls only
  // praise: external + support calls
  const issues = [];

  for (const t of transcripts) {
    const isExternal = t.callType === 'external';
    const isSupport = t.callType === 'support';
    if (!isExternal && !isSupport) continue;

    for (const km of t.keyMoments || []) {
      const isPraise = PRAISE_TYPES.includes(km.type);
      const isIssue = SIGNAL_TYPES.includes(km.type);

      if (!isPraise && !isIssue) continue;
      if (isIssue && !isExternal) continue; // issues from external only

      const area = inferProductArea(km.text || '');
      const acctRisk = riskByAccount[t.customerAccount] || null;

      issues.push({
        area,
        type: km.type,
        text: km.text || '',
        speaker: km.speaker || null,
        account: t.customerAccount || null,
        callType: t.callType,
        riskLevel: acctRisk?.riskLevel || null,
        riskScore: acctRisk?.riskScore || 0,
        transcriptId: t.id,
        transcriptTitle: t.title,
        date: t.startTime ? t.startTime.slice(0, 10) : null,
        sentimentScore: t.sentimentScore,
      });
    }
  }

  // Sort all issues: by risk score desc, then date desc
  issues.sort((a, b) =>
    (RISK_ORDER[a.riskLevel] ?? 4) - (RISK_ORDER[b.riskLevel] ?? 4) ||
    (b.date || '').localeCompare(a.date || '')
  );

  // Group by product area
  const byArea = {};
  for (const issue of issues) {
    if (!byArea[issue.area]) {
      byArea[issue.area] = {
        area: issue.area,
        totalIssues: 0,
        featureGaps: 0,
        concerns: 0,
        technicalIssues: 0,
        praise: 0,
        issues: [],
      };
    }
    const entry = byArea[issue.area];
    entry.totalIssues++;
    if (issue.type === 'feature_gap') entry.featureGaps++;
    if (issue.type === 'concern') entry.concerns++;
    if (issue.type === 'technical_issue') entry.technicalIssues++;
    if (issue.type === 'praise') entry.praise++;
    entry.issues.push(issue);
  }

  const areas = Object.values(byArea)
    .sort((a, b) => b.totalIssues - a.totalIssues);

  // Summary stats
  const nonPraise = issues.filter(i => !PRAISE_TYPES.includes(i.type));
  const totalIssues = nonPraise.length;
  const totalFeatureGaps = issues.filter(i => i.type === 'feature_gap').length;
  const totalConcerns = issues.filter(i => i.type === 'concern').length;
  const totalTechIssues = issues.filter(i => i.type === 'technical_issue').length;
  const totalPraise = issues.filter(i => i.type === 'praise').length;
  const criticalRiskIssues = nonPraise.filter(i => i.riskLevel === 'critical' || i.riskLevel === 'high').length;

  // Unique accounts affected
  const affectedAccounts = [...new Set(nonPraise.map(i => i.account).filter(Boolean))];

  res.json({
    totalIssues,
    totalFeatureGaps,
    totalConcerns,
    totalTechIssues,
    totalPraise,
    criticalRiskIssues,
    affectedAccounts: affectedAccounts.length,
    areas,
  });
});

module.exports = router;
