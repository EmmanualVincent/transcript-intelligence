'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
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
app.use('/api/features',     require('./routes/features'));
app.use('/api/actions',       require('./routes/actions'));
app.use('/api/chat',        require('./routes/chat'));
app.use('/api/syncs',          require('./routes/syncs'));
app.use('/api/product-health',     require('./routes/product-health'));
app.use('/api/support-analytics', require('./routes/support-analytics'));

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

// Serve built React frontend in production
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Eagerly initialize store so first request isn't slow
getStore();

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
