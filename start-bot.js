require('dotenv').config();
const { TradingBot } = require('./trading-bot/trading-bot');

console.log('\n🚀 TRADING BOT STARTING...\n');

const bot = new TradingBot();
console.log('✅ Bot initialized');
console.log('📊 Connecting to API...');
console.log('💰 Paper account: $100,000\n');

bot.start();

console.log('✅ Bot is RUNNING!');
console.log('📌 Press Ctrl+C to stop\n');

process.on('SIGINT', () => {
  console.log('\n🛑 Stopping bot...');
  bot.stop();
  process.exit(0);
});
