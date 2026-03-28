require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/analysis', async (req, res) => {
  try {
    const files = fs.readdirSync(__dirname).filter(f => f.startsWith('alpha-matrix'));
    if (files.length > 0) {
      const latest = files.sort().reverse()[0];
      const data = JSON.parse(fs.readFileSync(latest, 'utf8'));
      return res.json(data);
    }
    res.status(500).json({ error: 'No analysis available' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'MAQP Dashboard Online', timestamp: new Date().toISOString() });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MAQP Dashboard API running on port ${PORT}`);
});
