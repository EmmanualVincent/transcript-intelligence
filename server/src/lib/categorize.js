'use strict';

// Words that signal the end of a company name in a support case title
const SUPPORT_STOP_RE = /^(detect|comply|scim|backup|saml|ldap|sso|api|mfa|logvault|cloudprime|alert|invoice|overage|custom|slow|granular|billing|renewal|migration|integration|configuration|request|issue|error|failure|dispute|discrepancy|recovery|confirmation|access|rotation|timeout|delays|gaps|early|certificate|provisioning|false|restore|latency|data|log|report|connector|sync|token|login|formatting|performance|early)$/i;

const COMPLIANCE_TOPICS = new Set(['soc 2', 'iso 27001', 'hipaa', 'pci dss', 'cmmc', 'compliance audit', 'audit preparation']);

function extractSupportCaseAccount(title) {
  // "Support Case #1234 - CompanyName Description words..."
  const rest = title.replace(/^support case #\d+\s*-\s*/i, '');
  const words = rest.split(' ');
  const nameParts = [];
  for (const word of words) {
    if (SUPPORT_STOP_RE.test(word)) break;
    nameParts.push(word);
    if (nameParts.length === 3) break;
  }
  return nameParts.join(' ').replace(/[^a-zA-Z\s]/g, '').trim() || null;
}

function categorize(info, summary) {
  const title = info.title || '';
  const emails = info.allEmails || [];
  const topics = (summary.topics || []).map(t => t.toLowerCase());

  // ── Call type ──────────────────────────────────────────────────────────────
  const hasExternalEmail = emails.some(e => !e.endsWith('@aegiscloud.com'));
  let callType;
  if (!hasExternalEmail) {
    callType = 'internal';
  } else if (/^support case #/i.test(title)) {
    callType = 'support';
  } else {
    callType = 'external';
  }

  // ── Customer account ───────────────────────────────────────────────────────
  let customerAccount = null;
  if (/^aegis\s*\/\s*/i.test(title)) {
    customerAccount = title
      .replace(/^aegis\s*\/\s*/i, '')
      .split(' - ')[0]
      .trim();
  } else if (/^support case #/i.test(title)) {
    customerAccount = extractSupportCaseAccount(title);
  } else if (/^(urgent|escalation)\s*:/i.test(title)) {
    const m = title.match(/^(?:urgent|escalation)\s*:\s*(.+?)\s*-/i);
    if (m) customerAccount = m[1].trim();
  }

  // ── Category ───────────────────────────────────────────────────────────────
  let category;

  if (/outage|incident|war room|escalation bridge|remediation|root cause analysis|reliability sprint/i.test(title)) {
    category = 'incident';
  } else if (/renewal|contract review|contract discussion|multi-year|annual review|renewal finalization|renewal planning|renewal confirmation/i.test(title)) {
    category = 'renewal';
  } else if (/onboarding|kickoff|deployment kickoff|module setup|module deployment|module expansion/i.test(title)) {
    category = 'onboarding';
  } else if (/competitive|win.?loss/i.test(title)) {
    category = 'competitive';
  } else if (/sprint|roadmap|launch|design review|retro|standup|all hands|planning|adoption metrics|scalability|performance|ga deployment|launch day|launch readiness/i.test(title)) {
    category = 'product';
  } else if (callType === 'support') {
    category = 'support';
  } else if (
    /soc 2|iso 27001|hipaa|compliance|audit/i.test(title) ||
    topics.some(t => COMPLIANCE_TOPICS.has(t))
  ) {
    category = 'compliance';
  } else {
    category = 'ops';
  }

  return { callType, category, customerAccount };
}

module.exports = { categorize };
