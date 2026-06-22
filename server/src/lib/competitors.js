'use strict';

const KNOWN_COMPETITORS = [
  'SentinelShield',
  'CyberNova',
  'Wiz',
  'VaultGuard',
  'CrowdStrike',
  'Splunk',
];

// Words near these that suggest a competitor mention is meaningful
const EVAL_CONTEXT_RE = /evaluat|compar|switch|replac|consider|look(ing)? at|vendor|alternative|competitor/i;

function extractCompetitors(transcripts) {
  const map = {};
  for (const comp of KNOWN_COMPETITORS) {
    map[comp] = {
      name: comp,
      mentionCount: 0,
      callTypes: { internal: 0, external: 0, support: 0 },
      affectedAccounts: new Set(),
      contexts: [],
      sentimentScores: [],
    };
  }

  for (const t of transcripts) {
    // Build a single searchable blob: summary + key moments
    const blob = [
      t.summary || '',
      ...(t.keyMoments || []).map(km => km.text || ''),
    ].join(' ');

    // Also search full utterances for richer context
    const utteranceBlob = (t.utterances || []).map(u => u.sentence || '').join(' ');

    for (const comp of KNOWN_COMPETITORS) {
      const lc = comp.toLowerCase();
      const found = blob.toLowerCase().includes(lc) || utteranceBlob.toLowerCase().includes(lc);
      if (!found) continue;

      const entry = map[comp];
      entry.mentionCount++;
      entry.callTypes[t.callType] = (entry.callTypes[t.callType] || 0) + 1;

      if (t.customerAccount) entry.affectedAccounts.add(t.customerAccount);
      if (t.sentimentScore != null) entry.sentimentScores.push(t.sentimentScore);

      // Find the most relevant key moment with this competitor
      const relevantMoment = (t.keyMoments || []).find(km =>
        (km.text || '').toLowerCase().includes(lc)
      );

      // Fallback: find the utterance sentence with this competitor
      const relevantUtterance = !relevantMoment
        ? (t.utterances || []).find(u => (u.sentence || '').toLowerCase().includes(lc))
        : null;

      entry.contexts.push({
        transcriptId: t.id,
        transcriptTitle: t.title,
        callType: t.callType,
        account: t.customerAccount || null,
        sentimentScore: t.sentimentScore,
        date: t.startTime ? t.startTime.slice(0, 10) : null,
        momentType: relevantMoment ? relevantMoment.type : null,
        momentText: relevantMoment
          ? relevantMoment.text
          : relevantUtterance
            ? relevantUtterance.sentence
            : null,
      });
    }
  }

  return KNOWN_COMPETITORS
    .map(comp => {
      const e = map[comp];
      if (e.mentionCount === 0) return null;

      const scores = e.sentimentScores;
      const avgSentimentAtMention =
        scores.length
          ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 10) / 10
          : null;

      return {
        name: e.name,
        mentionCount: e.mentionCount,
        callTypes: e.callTypes,
        affectedAccounts: [...e.affectedAccounts],
        avgSentimentAtMention,
        contexts: e.contexts,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.mentionCount - a.mentionCount);
}

module.exports = { extractCompetitors, KNOWN_COMPETITORS };
