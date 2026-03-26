require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cron = require('node-cron');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'market_data_db'
});

global.db = pool;

app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date() });
});

app.get('/api/summary', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM stocks_data');
    res.json({ status: 'running', data_points: result.rows[0].count, timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/futures', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM futures_data ORDER BY timestamp DESC LIMIT 100');
    res.json({ count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stocks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stocks_data ORDER BY timestamp DESC LIMIT 100');
    res.json({ count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM market_news ORDER BY timestamp DESC LIMIT 50');
    res.json({ count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const DataCollector = require('./collectors/dataCollector');

cron.schedule('* * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Running data collection...`);
  try {
    await DataCollector.collectAll();
  } catch (error) {
    console.error('Error in scheduled data collection:', error);
  }
});

console.log('Running initial data collection...');
DataCollector.collectAll().catch(error => {
  console.error('Initial data collection failed:', error);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Market Data Pipeline running on port ${PORT}`);
  console.log('Data collection scheduled for every minute');
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});
