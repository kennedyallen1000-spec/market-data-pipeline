require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

let dashboardData = {
  stocks: [],
  sentiment: { bullishPercent: '50', bearishPercent: '50', sentiment: 'NEUTRAL' },
  patterns: [],
  prediction: { prediction: 'ANALYZING', confidence: '0' }
};

async function fetchStocks() {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
  const stocks = [];
  
  for (const symbol of symbols) {
    try {
      const res = await axios.get(
        'https://finnhub.io/api/v1/quote?symbol=' + symbol + '&token=' + process.env.FINNHUB_API_KEY,
        { timeout: 5000 }
      );
      if (res.data && res.data.c) {
        stocks.push({
          symbol: symbol,
          price: parseFloat(res.data.c.toFixed(2)),
          change: parseFloat((res.data.dp || 0).toFixed(2))
        });
      }
    } catch (e) {}
  }
  return stocks;
}

async function updateInBackground() {
  const stocks = await fetchStocks();
  const gainers = stocks.filter(s => s.change > 0).length;
  const bullish = ((gainers / stocks.length) * 100).toFixed(1);
  
  dashboardData = {
    stocks: stocks,
    sentiment: {
      bullishPercent: bullish,
      bearishPercent: (100 - bullish).toFixed(1),
      sentiment: bullish > 60 ? 'BULLISH' : bullish < 40 ? 'BEARISH' : 'NEUTRAL'
    },
    lastUpdate: new Date().toISOString()
  };
}

app.get('/api/dashboard', (req, res) => {
  res.json(dashboardData);
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
<title>Intelligence Platform</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: monospace; background: #0a0f23; color: #0f0; padding: 20px; }
.container { max-width: 1200px; margin: 0 auto; }
h1 { color: #0f0; text-shadow: 0 0 10px #0f0; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px; }
.panel { border: 2px solid #0f0; padding: 20px; background: rgba(0,255,0,0.05); }
.item { padding: 10px; background: rgba(0,255,0,0.1); margin: 10px 0; }
.positive { color: #0f0; }
.negative { color: #ff0; }
</style>
</head>
<body>
<div class="container">
  <h1>⚡ Intelligence Platform</h1>
  <p id="time">Loading...</p>
  
  <div class="grid">
    <div class="panel">
      <h2>📊 Sentiment</h2>
      <div class="item">Bullish: <span class="positive" id="bullish">--</span>%</div>
      <div class="item">Bearish: <span class="negative" id="bearish">--</span>%</div>
      <div class="item">Mode: <span id="mode">--</span></div>
    </div>

    <div class="panel">
      <h2>📈 Stocks</h2>
      <div id="stocks"><div>Loading...</div></div>
    </div>
  </div>
</div>

<script>
async function load() {
  try {
    const res = await fetch('/api/dashboard');
    const data = await res.json();
    
    document.getElementById('time').textContent = new Date().toLocaleString();
    
    if (data.sentiment) {
      document.getElementById('bullish').textContent = data.sentiment.bullishPercent;
      document.getElementById('bearish').textContent = data.sentiment.bearishPercent;
      document.getElementById('mode').textContent = data.sentiment.sentiment;
    }

    if (data.stocks && data.stocks.length) {
      let html = '';
      data.stocks.forEach(s => {
        const cls = s.change >= 0 ? 'positive' : 'negative';
        html += '<div class="item"><span>' + s.symbol + '</span>: <span class="' + cls + '">\\$' + s.price + ' (' + (s.change >= 0 ? '+' : '') + s.change + '%)</span></div>';
      });
      document.getElementById('stocks').innerHTML = html;
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

load();
setInterval(load, 60000);
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
  updateInBackground();
  setInterval(updateInBackground, 5 * 60 * 1000);
});
