'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');

const router = Router();

const SIGNAL_TYPES = ['feature_gap', 'concern', 'technical_issue'];

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

  // Build account risk lookup
  const riskByAccount = {};
  for (const acc of accounts) {
    riskByAccount[acc.name] = { riskLevel: acc.riskLevel, riskScore: acc.riskScore };
  }

  const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

  // Collect all customer-raised signals from external calls only
  const issues = [];

  for (const t of transcripts) {
    if (t.callType !== 'external') continue;

    for (const km of t.keyMoments || []) {
      if (!SIGNAL_TYPES.includes(km.type)) continue;

      const area = inferProductArea(km.text || '');
      const acctRisk = riskByAccount[t.customerAccount] || null;

      issues.push({
        area,
        type: km.type,
        text: km.text || '',
        speaker: km.speaker || null,
        account: t.customerAccount || null,
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
        issues: [],
      };
    }
    const entry = byArea[issue.area];
    entry.totalIssues++;
    if (issue.type === 'feature_gap') entry.featureGaps++;
    if (issue.type === 'concern') entry.concerns++;
    if (issue.type === 'technical_issue') entry.technicalIssues++;
    entry.issues.push(issue);
  }

  const areas = Object.values(byArea)
    .sort((a, b) => b.totalIssues - a.totalIssues);

  // Summary stats
  const totalIssues = issues.length;
  const totalFeatureGaps = issues.filter(i => i.type === 'feature_gap').length;
  const totalConcerns = issues.filter(i => i.type === 'concern').length;
  const totalTechIssues = issues.filter(i => i.type === 'technical_issue').length;
  const criticalRiskIssues = issues.filter(i => i.riskLevel === 'critical' || i.riskLevel === 'high').length;

  // Unique accounts affected
  const affectedAccounts = [...new Set(issues.map(i => i.account).filter(Boolean))];

  res.json({
    totalIssues,
    totalFeatureGaps,
    totalConcerns,
    totalTechIssues,
    criticalRiskIssues,
    affectedAccounts: affectedAccounts.length,
    areas,
  });
});

module.exports = router;
