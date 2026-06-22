'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getStore } = require('./data/store');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/overview',     require('./routes/overview'));
app.use('/api/transcripts',  require('./routes/transcripts'));
app.use('/api/sentiment',    require('./routes/sentiment'));
app.use('/api/accounts',     require('./routes/accounts'));
app.use('/api/competitive',  require('./routes/competitive'));
app.use('/api/incidents',    require('./routes/incidents'));
app.use('/api/features',     require('./routes/features'));
app.use('/api/actions',       require('./routes/actions'));
app.use('/api/revenue-risk', require('./routes/revenue-risk'));
app.use('/api/chat',        require('./routes/chat'));

// Health check
app.get('/health', (req, res) => {
  const { transcripts, accounts, competitors } = getStore();
  res.json({
    status: 'ok',
    transcripts: transcripts.length,
    accounts: accounts.length,
    competitors: competitors.length,
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

// Eagerly initialize store so first request isn't slow
getStore();

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
