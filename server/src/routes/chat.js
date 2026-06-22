'use strict';

const express = require('express');
const router = express.Router();
const { getStore } = require('../data/store');

const KNOWN_CATEGORIES = ['incident', 'renewal', 'onboarding', 'competitive', 'product', 'support', 'compliance', 'ops'];
const KNOWN_CALL_TYPES = ['internal', 'external'];
const MAX_TRANSCRIPTS = 15;

// Pre-built once at first call
let _accountsContext = null;
let _competitorContext = null;

function getStaticContext() {
  if (_accountsContext) return { accountsContext: _accountsContext, competitorContext: _competitorContext };

  const { accounts, competitors } = getStore();

  _accountsContext = accounts
    .sort((a, b) => b.riskScore - a.riskScore)
    .map(a =>
      `- ${a.name} | risk: ${a.riskLevel} (${a.riskScore}/100) | calls: ${a.transcriptCount} | last call: ${a.lastCallDate || 'unknown'} | concerns: ${(a.topConcerns || []).slice(0, 3).join(', ')}`
    )
    .join('\n');

  _competitorContext = competitors
    .sort((a, b) => b.mentionCount - a.mentionCount)
    .map(c =>
      `- ${c.name}: ${c.mentionCount} mentions, accounts: ${(c.affectedAccounts || []).slice(0, 6).join(', ')}`
    )
    .join('\n');

  return { accountsContext: _accountsContext, competitorContext: _competitorContext };
}

function scoreTranscript(t, q, matchedAccounts, matchedCompetitors, matchedCategories, matchedCallTypes) {
  let score = 0;
  const lower = q.toLowerCase();

  // Direct ID match — highest priority
  if (lower.includes(t.id.toLowerCase())) return 1000;

  // Title words present in the question
  const titleWords = (t.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
  for (const w of titleWords) {
    if (lower.includes(w)) score += 5;
  }

  // Account match
  if (t.customerAccount && matchedAccounts.has(t.customerAccount)) score += 40;

  // Competitor match — check topics and summary
  for (const comp of matchedCompetitors) {
    const text = `${t.summary} ${(t.topics || []).join(' ')}`.toLowerCase();
    if (text.includes(comp.toLowerCase())) score += 30;
  }

  // Category match
  if (matchedCategories.has(t.category)) score += 20;

  // Call type match
  if (matchedCallTypes.has(t.callType)) score += 10;

  return score;
}

function selectTranscripts(question, transcripts, accounts, competitors) {
  const lower = question.toLowerCase();

  // Extract mentions of known account names
  const matchedAccounts = new Set(
    accounts.map(a => a.name).filter(name => lower.includes(name.toLowerCase()))
  );

  // Extract mentions of known competitors
  const matchedCompetitors = competitors
    .map(c => c.name)
    .filter(name => lower.includes(name.toLowerCase()));

  // Extract category keywords
  const matchedCategories = new Set(KNOWN_CATEGORIES.filter(c => lower.includes(c)));

  // Extract call type keywords
  const matchedCallTypes = new Set(KNOWN_CALL_TYPES.filter(t => lower.includes(t)));

  const hasSpecificContext =
    matchedAccounts.size > 0 ||
    matchedCompetitors.length > 0 ||
    matchedCategories.size > 0 ||
    matchedCallTypes.size > 0;

  if (!hasSpecificContext) {
    // Broad/overview question — return top N by recency (already sorted chronologically)
    return { selected: transcripts.slice(-MAX_TRANSCRIPTS), isFiltered: false };
  }

  // Score and rank
  const scored = transcripts.map(t => ({
    t,
    score: scoreTranscript(t, lower, matchedAccounts, matchedCompetitors, matchedCategories, matchedCallTypes),
  }));

  scored.sort((a, b) => b.score - a.score);

  const selected = scored
    .filter(({ score }) => score > 0)
    .slice(0, MAX_TRANSCRIPTS)
    .map(({ t }) => t);

  // Fall back to recent if nothing matched
  if (selected.length === 0) return { selected: transcripts.slice(-MAX_TRANSCRIPTS), isFiltered: false };

  return { selected, isFiltered: true };
}

function formatTranscript(t) {
  const actions = (t.actionItems || [])
    .slice(0, 3)
    .map(a => (typeof a === 'string' ? a : a.text || a.description || JSON.stringify(a)))
    .join('; ');
  return `[ID: ${t.id}] "${t.title}"
  Date: ${t.startTime ? t.startTime.slice(0, 10) : 'unknown'} | Customer: ${t.customerAccount || 'internal'} | Type: ${t.callType} | Category: ${t.category}
  Sentiment: ${t.overallSentiment || 'unknown'} (score: ${t.sentimentScore ?? 'n/a'})
  Summary: ${(t.summary || '').slice(0, 350)}
  Actions: ${actions || 'none'}`;
}

function buildPrompt(question) {
  const { transcripts, accounts, competitors } = getStore();
  const { accountsContext, competitorContext } = getStaticContext();
  const { selected, isFiltered } = selectTranscripts(question, transcripts, accounts, competitors);

  const transcriptNote = isFiltered
    ? `Showing ${selected.length} of ${transcripts.length} calls most relevant to this query.`
    : `Showing ${selected.length} most recent of ${transcripts.length} total calls (no specific filter matched).`;

  return `You are an AI assistant embedded in AegisCloud's call intelligence platform (${transcripts.length} total calls).
Answer questions about calls, customers, action items, sentiment, competitors, and account risks.
When referring to a transcript, mention its title and date. Be concise and factual.

=== ACCOUNT HEALTH (all accounts, sorted by risk) ===
${accountsContext}

=== COMPETITOR MENTIONS ===
${competitorContext}

=== RELEVANT CALL TRANSCRIPTS ===
${transcriptNote}

${selected.map(formatTranscript).join('\n\n')}`;
}

router.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
      return res.status(503).json({ error: 'GROQ_API_KEY is not configured in server/.env' });
    }

    const systemPrompt = buildPrompt(message);

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10),
          { role: 'user', content: message },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[chat] Groq API error:', errText);
      return res.status(502).json({ error: 'Failed to get response from Groq API' });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content ?? 'No response generated.';
    res.json({ reply });
  } catch (err) {
    console.error('[chat] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
