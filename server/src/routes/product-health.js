'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');
const { avg } = require('../lib/util');
const { riskByAccountName } = require('../lib/accounts');

const router = Router();

// Assign a transcript to its primary product by scanning title + topics + summary
function inferProduct(t) {
  const text = [t.title, ...(t.topics || []), t.summary].join(' ').toLowerCase();
  if (/\bcomply\b|compliance report|soc 2|hipaa|iso 27001|pci dss|cmmc|audit report|multi.framework|evidence|audit trail/.test(text)) return 'Comply';
  if (/\bidentity\b|mfa|sso|saml|scim|ldap|provisioning|okta|entra|active directory|iam|privileged access|rbac|role.based|session timeout/.test(text)) return 'Identity';
  if (/\bdetect\b|alert|threat detection|deduplication|false positive|detection pipeline|threat monitoring|signal.to.noise/.test(text)) return 'Detect';
  if (/\bprotect\b|backup|restore|recovery|rto|granular restore|cloudprime|s3|ebs|disaster recovery/.test(text)) return 'Protect';
  if (/logvault|siem|log ingestion|log pipeline/.test(text)) return 'LogVault';
  return 'Platform';
}

// Assign a key moment to a product (used for praise/upsell quotes)
function inferMomentProduct(text) {
  const t = (text || '').toLowerCase();
  if (/comply|compliance report|soc 2|hipaa|iso|pci|cmmc|audit report|multi.framework/.test(t)) return 'Comply';
  if (/identity|mfa|sso|saml|scim|ldap|provisioning|okta|entra|active directory|iam|privileged access|session timeout|role.based/.test(t)) return 'Identity';
  if (/detect|alert|threat|detection|deduplication|false positive|pipeline|monitoring/.test(t)) return 'Detect';
  if (/protect|backup|restore|recovery|s3|ebs|granular restore|rto|cloudprime/.test(t)) return 'Protect';
  if (/logvault|siem|log ingestion|log pipeline/.test(t)) return 'LogVault';
  return null; // don't assign generic moments to Platform
}

const PRODUCT_ORDER = ['Comply', 'Identity', 'Detect', 'Protect', 'LogVault', 'Platform'];

// GET /api/product-health
router.get('/', (req, res) => {
  const { transcripts, accounts } = getStore();

  const riskByAccount = riskByAccountName(accounts);

  const external = transcripts.filter(t => t.callType === 'external');

  // Build per-product buckets
  const buckets = {};
  for (const name of PRODUCT_ORDER) {
    buckets[name] = {
      name,
      callCount: 0,
      accounts: new Set(),
      sentiment: [],
      praise: [],
      churnSignals: [],
      featureGaps: [],
      concerns: [],
      positivePivots: [],
      upsells: [],
      technicalIssues: [],
      renewalCalls: 0,
      onboardingCalls: 0,
    };
  }

  for (const t of external) {
    const product = inferProduct(t);
    const b = buckets[product];
    if (!b) continue;

    b.callCount++;
    if (t.customerAccount) b.accounts.add(t.customerAccount);
    if (t.sentimentScore != null) b.sentiment.push(t.sentimentScore);
    if (t.category === 'renewal') b.renewalCalls++;
    if (t.category === 'onboarding') b.onboardingCalls++;

    for (const km of t.keyMoments || []) {
      const entry = {
        text: km.text || '',
        account: t.customerAccount || null,
        riskLevel: riskByAccount[t.customerAccount]?.riskLevel || null,
        transcriptId: t.id,
        transcriptTitle: t.title,
        date: t.startTime ? t.startTime.slice(0, 10) : null,
        speaker: km.speaker || null,
      };

      if (km.type === 'praise') b.praise.push(entry);
      else if (km.type === 'churn_signal') b.churnSignals.push(entry);
      else if (km.type === 'feature_gap') b.featureGaps.push(entry);
      else if (km.type === 'concern') b.concerns.push(entry);
      else if (km.type === 'positive_pivot') b.positivePivots.push(entry);
      else if (km.type === 'pricing_offer') b.upsells.push(entry);
      else if (km.type === 'technical_issue') b.technicalIssues.push(entry);
    }
  }

  // Also attribute praise/upsell/churn moments from other-typed transcripts
  // by scanning the moment text directly (catches cross-product moments in mixed calls)
  for (const t of external) {
    const transcriptProduct = inferProduct(t);
    for (const km of t.keyMoments || []) {
      if (!['praise', 'pricing_offer'].includes(km.type)) continue;
      const momentProduct = inferMomentProduct(km.text || '');
      // If the moment is for a different product than the transcript's primary, credit both
      if (momentProduct && momentProduct !== transcriptProduct && buckets[momentProduct]) {
        const entry = {
          text: km.text || '',
          account: t.customerAccount || null,
          riskLevel: riskByAccount[t.customerAccount]?.riskLevel || null,
          transcriptId: t.id,
          transcriptTitle: t.title,
          date: t.startTime ? t.startTime.slice(0, 10) : null,
          speaker: km.speaker || null,
        };
        if (km.type === 'praise') {
          const exists = buckets[momentProduct].praise.some(p => p.text === entry.text);
          if (!exists) buckets[momentProduct].praise.push(entry);
        }
        if (km.type === 'pricing_offer') {
          const exists = buckets[momentProduct].upsells.some(u => u.text === entry.text);
          if (!exists) buckets[momentProduct].upsells.push(entry);
        }
      }
    }
  }

  // Build product summaries
  const products = PRODUCT_ORDER
    .map(name => {
      const b = buckets[name];
      if (b.callCount === 0) return null;

      const avgSentiment = avg(b.sentiment, 2);

      // Health score: rate-based so high-volume products aren't unfairly penalized
      const calls = b.callCount;
      const healthScore = Math.min(100, Math.max(0, Math.round(
        50
        + (avgSentiment != null ? (avgSentiment - 3.0) * 15 : 0)
        + Math.min(15, (b.praise.length / calls) * 15)
        + Math.min(10, (b.upsells.length / calls) * 15)
        + Math.min(8,  (b.positivePivots.length / calls) * 10)
        - Math.min(30, (b.churnSignals.length / calls) * 30)
        - Math.min(10, (b.technicalIssues.length / calls) * 15)
      )));

      // Signal tags (rate-based so high-volume products aren't mislabelled)
      const churnRate = b.churnSignals.length / b.callCount;
      const tags = [];
      if (b.upsells.length >= 2) tags.push('upsell_opportunity');
      if (b.renewalCalls >= 3 && churnRate < 0.6) tags.push('retention_driver');
      if (avgSentiment != null && avgSentiment >= 4.0) tags.push('high_satisfaction');
      if (b.onboardingCalls >= 2) tags.push('active_adoption');
      if ((avgSentiment != null && avgSentiment < 2.8) || churnRate > 0.7) tags.push('at_risk');

      // Top voice quotes: praise first, then positive pivots
      const topQuotes = [
        ...b.praise.slice(0, 2).map(q => ({ ...q, signalType: 'praise' })),
        ...b.positivePivots.slice(0, 1).map(q => ({ ...q, signalType: 'positive_pivot' })),
      ].slice(0, 3);

      return {
        name,
        callCount: b.callCount,
        accountCount: b.accounts.size,
        avgSentiment,
        healthScore,
        tags,
        praiseCount: b.praise.length,
        churnSignalCount: b.churnSignals.length,
        featureGapCount: b.featureGaps.length,
        concernCount: b.concerns.length,
        positivePivotCount: b.positivePivots.length,
        upsellCount: b.upsells.length,
        technicalIssueCount: b.technicalIssues.length,
        renewalCalls: b.renewalCalls,
        onboardingCalls: b.onboardingCalls,
        topQuotes,
        topIssues: [
          ...b.churnSignals.slice(0, 2).map(i => ({ ...i, type: 'churn_signal' })),
          ...b.featureGaps.slice(0, 2).map(i => ({ ...i, type: 'feature_gap' })),
          ...b.concerns.slice(0, 1).map(i => ({ ...i, type: 'concern' })),
        ].slice(0, 4),
        upsellMoments: b.upsells.slice(0, 3),
      };
    })
    .filter(Boolean);

  res.json({ products });
});

module.exports = router;
