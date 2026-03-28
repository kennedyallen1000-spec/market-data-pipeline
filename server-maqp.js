require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Load MAQP from file or run it
let cachedAnalysis = null;
let lastAnalysisTime = 0;

async function runMAQPAnalysis() {
  // For now, read from the saved file
  try {
    const files = fs.readdirSync(__dirname).filter(f => f.startsWith('alpha-matrix'));
    if (files.length > 0) {
      const latest = files.sort().reverse()[0];
      const data = JSON.parse(fs.readFileSync(latest, 'utf8'));
      return data;
    }
  } catch (e) {
    console.error('Error reading MAQP file:', e.message);
  }
  return null;
}

// API Routes
app.get('/api/analysis', async (req, res) => {
  const analysis = await runMAQPAnalysis();
  if (analysis) {
    res.json(analysis);
  } else {
    res.status(500).json({ error: 'No analysis available' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'MAQP Dashboard Online', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MAQP Dashboard API running on port ${PORT}`);
});
