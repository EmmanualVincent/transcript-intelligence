'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');
const { riskByAccountName } = require('../lib/accounts');

const router = Router();

function parseOwner(actionItem) {
  const colonIdx = actionItem.indexOf(':');
  if (colonIdx === -1) return null;
  const candidate = actionItem.slice(0, colonIdx).trim();
  // Reject if the "owner" looks like a sentence fragment (contains a verb word or is too long)
  if (candidate.split(' ').length > 4) return null;
  return candidate;
}

function buildActionIndex(transcripts, accounts) {
  const accountRiskMap = riskByAccountName(accounts);

  const ownerMap = {};
  const accountMap = {};

  for (const t of transcripts) {
    for (const raw of t.actionItems || []) {
      const owner = parseOwner(raw);
      if (!owner) continue;

      const text = raw.slice(raw.indexOf(':') + 1).trim();
      const item = {
        owner,
        text,
        raw,
        transcriptId: t.id,
        transcriptTitle: t.title,
        callType: t.callType,
        category: t.category,
        account: t.customerAccount || null,
        sentimentScore: t.sentimentScore,
        date: t.startTime ? t.startTime.slice(0, 10) : null,
        accountRiskLevel: t.customerAccount ? (accountRiskMap[t.customerAccount]?.riskLevel || null) : null,
        accountRiskScore: t.customerAccount ? (accountRiskMap[t.customerAccount]?.riskScore || null) : null,
      };

      // Index by owner
      if (!ownerMap[owner]) {
        ownerMap[owner] = { owner, items: [], accountsSet: new Set(), highRiskCount: 0 };
      }
      ownerMap[owner].items.push(item);
      if (item.account) ownerMap[owner].accountsSet.add(item.account);
      if (item.accountRiskLevel === 'critical' || item.accountRiskLevel === 'high') {
        ownerMap[owner].highRiskCount++;
      }

      // Index by account
      if (item.account) {
        if (!accountMap[item.account]) {
          accountMap[item.account] = {
            account: item.account,
            riskLevel: item.accountRiskLevel,
            riskScore: item.accountRiskScore,
            items: [],
            ownersSet: new Set(),
          };
        }
        accountMap[item.account].items.push(item);
        accountMap[item.account].ownersSet.add(owner);
      }
    }
  }

  const byOwner = Object.values(ownerMap)
    .map(o => ({
      owner: o.owner,
      totalItems: o.items.length,
      affectedAccounts: [...o.accountsSet],
      highRiskCount: o.highRiskCount,
      items: o.items.sort((a, b) => (b.accountRiskScore || 0) - (a.accountRiskScore || 0)),
    }))
    .sort((a, b) => b.totalItems - a.totalItems);

  const byAccount = Object.values(accountMap)
    .map(a => ({
      account: a.account,
      riskLevel: a.riskLevel,
      riskScore: a.riskScore,
      totalItems: a.items.length,
      owners: [...a.ownersSet],
      items: a.items,
    }))
    .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

  return { byOwner, byAccount };
}

// GET /api/actions
router.get('/', (req, res) => {
  const { transcripts, accounts } = getStore();
  const { byOwner, byAccount } = buildActionIndex(transcripts, accounts);

  const totalItems = byOwner.reduce((s, o) => s + o.totalItems, 0);
  const highRiskItems = byOwner.reduce((s, o) => s + o.highRiskCount, 0);

  res.json({
    totalItems,
    totalOwners: byOwner.length,
    highRiskItems,
    accountsWithCommitments: byAccount.length,
    byOwner,
    byAccount,
  });
});

module.exports = router;
