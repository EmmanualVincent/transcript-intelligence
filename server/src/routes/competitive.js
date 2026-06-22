'use strict';

const { Router } = require('express');
const { getStore } = require('../data/store');

const router = Router();

// GET /api/competitive
router.get('/', (req, res) => {
  const { competitors } = getStore();
  // Strip verbose contexts from list view
  const list = competitors.map(({ contexts, ...c }) => ({
    ...c,
    contextCount: contexts.length,
    topContext: contexts[0] || null,
  }));
  res.json({ competitors: list, total: list.length });
});

// GET /api/competitive/:name
router.get('/:name', (req, res) => {
  const { competitors, transcripts } = getStore();
  const name = decodeURIComponent(req.params.name);
  const comp = competitors.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (!comp) return res.status(404).json({ error: 'Competitor not found' });

  // Enrich contexts with transcript titles for convenience
  const enrichedContexts = comp.contexts.map(ctx => {
    const t = transcripts.find(x => x.id === ctx.transcriptId);
    return {
      ...ctx,
      category: t ? t.category : null,
      overallSentiment: t ? t.overallSentiment : null,
    };
  }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  res.json({ ...comp, contexts: enrichedContexts });
});

module.exports = router;
