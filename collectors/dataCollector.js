const axios = require('axios');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const SAMPLE_STOCKS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'JPM', 'XOM', 'AMZN', 'JNJ'];

class DataCollector {
  async collectFuturesData() {
    console.log('[FUTURES] Collecting crypto data...');
    try {
      const cryptoSymbols = ['BTCUSD', 'ETHUSD'];
      for (const symbol of cryptoSymbols) {
        try {
          const response = await axios.get('https://finnhub.io/api/v1/crypto/quote', {
            params: { symbol: symbol, token: FINNHUB_API_KEY },
            timeout: 5000
          });
          const quote = response.data;
          if (quote.c) {
            await global.db.query(
              `INSERT INTO futures_data (symbol, price, bid_price, ask_price, timestamp, data_source, raw_data) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [symbol, quote.c, quote.b || quote.c, quote.a || quote.c, new Date(quote.t ? quote.t * 1000 : Date.now()), 'finnhub', JSON.stringify(quote)]
            );
            console.log(`  ✓ ${symbol}: $${quote.c}`);
          }
        } catch (err) {
          console.error(`  ✗ ${symbol}: ${err.message}`);
        }
      }
    } catch (error) {
      console.error('Futures error:', error.message);
    }
  }

  async collectStocksData() {
    console.log('[STOCKS] Collecting stock prices...');
    try {
      for (const symbol of SAMPLE_STOCKS) {
        try {
          const response = await axios.get('https://finnhub.io/api/v1/quote', {
            params: { symbol: symbol, token: FINNHUB_API_KEY },
            timeout: 5000
          });
          const quote = response.data;
          if (quote.c) {
            const sectors = {
              'AAPL': 'Technology', 'MSFT': 'Technology', 'NVDA': 'Technology', 'TSLA': 'Technology',
              'JPM': 'Finance', 'XOM': 'Energy', 'AMZN': 'Consumer', 'JNJ': 'Healthcare'
            };
            await global.db.query(
              `INSERT INTO stocks_data (symbol, sector, price, bid_price, ask_price, price_change, price_change_percent, timestamp, data_source, raw_data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [symbol, sectors[symbol] || 'Other', quote.c, quote.b || quote.c, quote.a || quote.c, quote.d || 0, quote.dp || 0, new Date(quote.t ? quote.t * 1000 : Date.now()), 'finnhub', JSON.stringify(quote)]
            );
            console.log(`  ✓ ${symbol}: $${quote.c}`);
          }
        } catch (err) {
          console.error(`  ✗ ${symbol}: ${err.message}`);
        }
      }
    } catch (error) {
      console.error('Stocks error:', error.message);
    }
  }

  async collectMarketNews() {
    console.log('[NEWS] Collecting market news...');
    try {
      const response = await axios.get('https://finnhub.io/api/v1/news', {
        params: { category: 'general', token: FINNHUB_API_KEY },
        timeout: 5000
      });
      const newsItems = response.data.slice(0, 10);
      for (const item of newsItems) {
        try {
          await global.db.query(
            `INSERT INTO market_news (headline, summary, source, url, timestamp, data_source, raw_data) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [item.headline, item.summary, item.source, item.url, new Date(item.datetime * 1000), 'finnhub', JSON.stringify(item)]
          );
        } catch (err) {}
      }
      console.log(`  ✓ Collected ${newsItems.length} news items`);
    } catch (error) {
      console.error('News error:', error.message);
    }
  }

  async collectAll() {
    console.log('\n========== DATA COLLECTION ==========');
    try {
      await this.collectFuturesData().catch(e => {});
      await this.collectStocksData().catch(e => {});
      await this.collectMarketNews().catch(e => {});
      console.log('========== COMPLETE ==========\n');
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

module.exports = new DataCollector();
