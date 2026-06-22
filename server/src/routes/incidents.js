'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');

const router = Router();

const INCIDENT_RE = /detect outage|detect pipeline|incident|war room|escalation bridge|remediation|root cause|outage impact|threat visibility|reliability sprint/i;

function assignThreadRole(t) {
  const title = t.title.toLowerCase();
  if (/war room/.test(title)) return 'war_room';
  if (/remediation/.test(title)) return 'remediation';
  if (/root cause/.test(title)) return 'root_cause';
  if (/escalation bridge/.test(title)) return 'escalation';
  if (/urgent|escalation:/i.test(t.title)) return 'customer_escalation';
  if (/customer impact/.test(title)) return 'customer_impact';
  if (/post.incident|post-incident/.test(title)) return 'postmortem';
  if (/30.day review/.test(title)) return 'review';
  if (/reliability sprint/.test(title)) return 'reliability_sprint';
  if (t.callType === 'support') return 'support_ticket';
  if (t.callType === 'external') return 'customer_call';
  return 'internal';
}

// GET /api/incidents
router.get('/', (req, res) => {
  const { transcripts } = getStore();

  const thread = transcripts
    .filter(t => INCIDENT_RE.test(t.title) || t.category === 'incident')
    .map(({ utterances, ...t }) => ({
      ...t,
      threadRole: assignThreadRole(t),
    }))
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Summary stats
  const roleBreakdown = {};
  for (const t of thread) {
    roleBreakdown[t.threadRole] = (roleBreakdown[t.threadRole] || 0) + 1;
  }

  const totalChurnSignals = thread.reduce(
    (sum, t) => sum + (t.keyMoments || []).filter(km => km.type === 'churn_signal').length,
    0
  );

  const affectedAccounts = [...new Set(thread.filter(t => t.customerAccount).map(t => t.customerAccount))];

  res.json({
    thread,
    total: thread.length,
    roleBreakdown,
    totalChurnSignals,
    affectedAccounts,
  });
});

module.exports = router;
