'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');

const router = Router();

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
  const { transcripts } = getStore();

  const gapMap = {};

  for (const t of transcripts) {
    for (const km of t.keyMoments || []) {
      if (km.type !== 'feature_gap') continue;

      const text = km.text || '';
      const area = inferProductArea(text);
      const key = `${area}__${text.slice(0, 60)}`; // deduplicate near-identical gaps

      if (!gapMap[key]) {
        gapMap[key] = {
          area,
          description: text,
          mentions: 0,
          accounts: new Set(),
          transcripts: [],
        };
      }

      gapMap[key].mentions++;
      if (t.customerAccount) gapMap[key].accounts.add(t.customerAccount);
      gapMap[key].transcripts.push({
        id: t.id,
        title: t.title,
        callType: t.callType,
        date: t.startTime ? t.startTime.slice(0, 10) : null,
        speaker: km.speaker || null,
      });
    }
  }

  // Aggregate by area
  const byArea = {};
  for (const gap of Object.values(gapMap)) {
    if (!byArea[gap.area]) byArea[gap.area] = { area: gap.area, totalMentions: 0, gaps: [] };
    byArea[gap.area].totalMentions += gap.mentions;
    byArea[gap.area].gaps.push({
      description: gap.description,
      mentions: gap.mentions,
      accounts: [...gap.accounts],
      transcripts: gap.transcripts,
    });
  }

  // Sort areas by total mentions, gaps within each area by mentions
  const areas = Object.values(byArea)
    .sort((a, b) => b.totalMentions - a.totalMentions)
    .map(a => ({
      ...a,
      gaps: a.gaps.sort((x, y) => y.mentions - x.mentions),
    }));

  // Flat list for quick access
  const allGaps = Object.values(gapMap).map(g => ({
    area: g.area,
    description: g.description,
    mentions: g.mentions,
    accounts: [...g.accounts],
    transcripts: g.transcripts,
  })).sort((a, b) => b.mentions - a.mentions);

  res.json({ areas, allGaps, totalGaps: allGaps.length });
});

module.exports = router;
