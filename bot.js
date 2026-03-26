require('dotenv').config();

console.log('\n🚀 TRADING BOT WITH CLAUDE AI\n');

class TradingBot {
  constructor() {
    console.log('✅ Bot initialized');
    this.claudeApiKey = process.env.ANTHROPIC_API_KEY;
  }

  async analyzeWithClaude(stocksData) {
    if (!this.claudeApiKey) {
      console.log('⊘ No Claude API key');
      return null;
    }

    try {
      console.log('🧠 Analyzing with Claude...');
      
      const topStocks = stocksData.slice(0, 5).map(s => 
        `${s.symbol}: $${s.price} (${s.price_change_percent}%)`
      ).join(', ');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
  'Content-Type': 'application/json',
  'x-api-key': this.claudeApiKey,
  'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-1',
          max_tokens: 200,
          messages: [{ 
            role: 'user', 
            content: `Stocks: ${topStocks}. Should we buy or skip? One word.` 
          }]
        })
      });

      if (!response.ok) {
  const errorText = await response.text();
  console.error('❌ Claude error:', response.status);
  console.error('Error details:', errorText);
  return null;
      }

      const data = await response.json();
      const text = data.content[0].text;
      console.log('✅ Claude says:', text);
      return text;
    } catch (error) {
      console.error('Error:', error.message);
    }
    return null;
  }

  async runDailyCycle() {
    console.log('\n🤖 Cycle starting...');
    try {
      const stocksRes = await fetch('http://localhost:3000/api/stocks');
      const newsRes = await fetch('http://localhost:3000/api/news');
      
      if (!stocksRes.ok || !newsRes.ok) {
        console.error('❌ Server not running');
        return;
      }

      const stocks = await stocksRes.json();
      console.log(`✅ Fetched ${stocks.data.length} stocks`);
      
      await this.analyzeWithClaude(stocks.data);
      console.log('✅ Complete!');
    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  start() {
    console.log('🚀 Bot running\n');
    this.runDailyCycle();
  }

  stop() {
    console.log('🛑 Stopped');
  }
}

const bot = new TradingBot();
bot.start();

console.log('Ctrl+C to stop\n');

process.on('SIGINT', () => {
  console.log('\n🛑 Stopping...');
  bot.stop();
  process.exit(0);
});