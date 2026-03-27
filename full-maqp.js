require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// MAQP CALCULATOR
class MAQPCalculator {
  tierOneSweep(stocks) {
    console.log('🔍 TIER 1: Scanning for volume outliers...');
    const volumeValues = stocks.map(s => s.volume || 0);
    const mean = volumeValues.reduce((a, b) => a + b) / volumeValues.length;
    const stdDev = Math.sqrt(volumeValues.reduce((sum, v) => sum + Math.pow(v - mean, 2)) / volumeValues.length);
    
    const outliers = stocks.filter(s => {
      const z = stdDev > 0 ? Math.abs((s.volume - mean) / stdDev) : 0;
      return z > 2;
    });
    return outliers.slice(0, Math.ceil(stocks.length * 0.05));
  }

  tierTwoMeanReversion(stocks) {
    console.log('📊 TIER 2: Finding mean reversion targets...');
    return stocks.filter(s => Math.abs(s.zScore || 0) >= 3);
  }

  tierThreeCrossAsset(stocks) {
    console.log('🔗 TIER 3: Detecting cross-asset signals...');
    const mag7 = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];
    const mag7Stocks = stocks.filter(s => mag7.includes(s.symbol));
    
    const signals = [];
    stocks.forEach(stock => {
      mag7Stocks.forEach(mag => {
        if (Math.abs(mag.priceChangePercent) > 5 && Math.abs(stock.priceChangePercent) < 2) {
          signals.push({
            leader: mag.symbol,
            follower: stock.symbol,
            expectedMove: mag.priceChangePercent * 0.7
          });
        }
      });
    });
    return signals;
  }

  identifyLongShortPairs(stocks) {
    console.log('⚖️ Creating Long/Short hedge pairs...');
    const sectors = {};
    stocks.forEach(s => {
      if (!sectors[s.sector]) sectors[s.sector] = [];
      sectors[s.sector].push(s);
    });
    
    const pairs = [];
    Object.keys(sectors).forEach(sec => {
      const sorted = sectors[sec].sort((a, b) => b.priceChangePercent - a.priceChangePercent);
      if (sorted.length >= 2) {
        pairs.push({ long: sorted[0], short: sorted[sorted.length - 1], sector: sec });
      }
    });
    return pairs;
  }

  detectRegime(stocks) {
    const trendCount = stocks.filter(s => Math.abs(s.priceChangePercent) > 3).length;
    const ratio = trendCount / stocks.length;
    return {
      regime: ratio > 0.3 ? 'TREND_FOLLOWING' : 'MEAN_REVERSION',
      trendRatio: (ratio * 100).toFixed(1)
    };
  }

  async runFullAnalysis(stocks) {
    console.log('\n🔬 STARTING MAQP ANALYSIS...\n');
    const tier1 = this.tierOneSweep(stocks);
    console.log(`✅ Tier 1: Found ${tier1.length} volume outliers\n`);

    const tier2 = this.tierTwoMeanReversion(tier1);
    console.log(`✅ Tier 2: Found ${tier2.length} mean reversion targets\n`);

    const tier3 = this.tierThreeCrossAsset(stocks);
    console.log(`✅ Tier 3: Found ${tier3.length} cross-asset signals\n`);

    const pairs = this.identifyLongShortPairs(stocks);
    console.log(`✅ Long/Short: Created ${pairs.length} hedged pairs\n`);

    const regime = this.detectRegime(stocks);
    console.log(`✅ Regime: ${regime.regime} (${regime.trendRatio}% trend)\n`);

    return { tier1, tier2, tier3, pairs, regime };
  }
}

// STOCK FETCHER
class StockFetcher {
  constructor() {
    this.finnhubKey = process.env.FINNHUB_API_KEY;
  }

  getPopularStocks() {
    return [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
      'ADBE', 'CRM', 'INTC', 'AMD', 'QCOM', 'CSCO', 'IBM',
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK',
      'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY',
      'XOM', 'CVX', 'COP', 'SLB',
      'WMT', 'TGT', 'COST', 'MCD', 'SBUX', 'NKE',
      'BA', 'CAT', 'GE', 'DE', 'RTX'
    ];
  }

  async fetchStockData(symbol) {
    try {
      const res = await axios.get(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.finnhubKey}`,
        { timeout: 5000 }
      );
      if (!res.data || res.data.c === undefined) return null;
      
      return {
        symbol,
        price: res.data.c,
        volume: res.data.v || 0,
        priceChangePercent: res.data.dp || 0,
        volatility: Math.abs(res.data.dp) || 0
      };
    } catch (e) {
      return null;
    }
  }

  async fetchMultipleStocks(symbols) {
    console.log(`📥 Fetching data for ${symbols.length} stocks...`);
    const results = [];
    
    for (let i = 0; i < symbols.length; i += 5) {
      const batch = symbols.slice(i, i + 5);
      const batchResults = await Promise.all(batch.map(s => this.fetchStockData(s)));
      batchResults.forEach(r => { if (r) results.push(r); });
      if (i + 5 < symbols.length) await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log(`✅ Fetched ${results.length} stocks\n`);
    return results;
  }

  classifyBySector(stocks) {
    const map = {
      'AAPL': 'Tech', 'MSFT': 'Tech', 'GOOGL': 'Tech', 'AMZN': 'Consumer', 'NVDA': 'Tech',
      'META': 'Tech', 'TSLA': 'Consumer', 'JPM': 'Finance', 'BAC': 'Finance', 'WFC': 'Finance',
      'JNJ': 'Healthcare', 'UNH': 'Healthcare', 'PFE': 'Healthcare', 'XOM': 'Energy', 'CVX': 'Energy'
    };
    return stocks.map(s => ({ ...s, sector: map[s.symbol] || 'Other' }));
  }

  async getAllStocksData() {
    const symbols = this.getPopularStocks();
    let stocks = await this.fetchMultipleStocks(symbols);
    return this.classifyBySector(stocks);
  }
}

// CLAUDE ANALYZER
async function analyzeWithClaude(maqpResults, stocks, claudeKey) {
  console.log('\n🧠 Sending to Claude MAQP Analyzer...\n');

  const topMovers = stocks.sort((a, b) => Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent)).slice(0, 10);

  const prompt = `You are MAQP (Multi-Asset Quantum Pipeline). Analyze this market data and return ONLY valid JSON:

Data:
- Total stocks: ${stocks.length}
- Tier 1 outliers: ${maqpResults.tier1.length}
- Tier 2 mean reversion: ${maqpResults.tier2.length}
- Tier 3 cross-asset: ${maqpResults.tier3.length}
- Market regime: ${maqpResults.regime.regime}
- Top movers: ${JSON.stringify(topMovers.map(s => ({ symbol: s.symbol, change: s.priceChangePercent })))}

Return this JSON structure ONLY:
{
  "opportunities": [
    {"symbol": "TICKER", "action": "BUY/SELL", "confidence": 0.8, "reason": "text"}
  ],
  "regime": "${maqpResults.regime.regime}",
  "analysis_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) {
      console.error(`❌ Claude API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    console.error('Error:', e.message);
    return null;
  }
}

// MAIN
async function main() {
  console.log('\n' + '='.repeat(100));
  console.log('MULTI-ASSET QUANTUM PIPELINE (MAQP)');
  console.log('Renaissance Technologies Framework for Market Alpha Extraction');
  console.log('='.repeat(100));

  const fetcher = new StockFetcher();
  const calculator = new MAQPCalculator();

  const stocks = await fetcher.getAllStocksData();
  if (stocks.length === 0) {
    console.error('❌ No stocks fetched. Check API keys and internet connection.');
    return;
  }

  const maqpResults = await calculator.runFullAnalysis(stocks);
  const analysis = await analyzeWithClaude(maqpResults, stocks, process.env.ANTHROPIC_API_KEY);

  if (analysis) {
    console.log('\n' + '='.repeat(100));
    console.log('🎯 GLOBAL ALPHA MATRIX');
    console.log('='.repeat(100) + '\n');
    
    console.log(`📊 Market Regime: ${analysis.regime}\n`);
    console.log('TOP OPPORTUNITIES:\n');
    
    analysis.opportunities.slice(0, 10).forEach((opp, i) => {
      console.log(`${i + 1}. ${opp.symbol} - ${opp.action} (${(opp.confidence * 100).toFixed(0)}%)`);
      console.log(`   Reason: ${opp.reason}\n`);
    });
    
    const filename = `alpha-matrix-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(analysis, null, 2));
    console.log(`✅ Results saved to: ${filename}\n`);
  } else {
    console.log('⚠️ Could not generate analysis from Claude\n');
  }
}

main().catch(console.error);
