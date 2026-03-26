const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres'
});
async function setupDatabase() {
  const client = await pool.connect();
  try {
    const dbName = process.env.DB_NAME || 'market_data_db';
    console.log(`Creating database: ${dbName}`);
    try {
      await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
    } catch (err) {}
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`Database created`);
    client.release();
    const newPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: dbName
    });
    const newClient = await newPool.connect();
    try {
      await newClient.query(`CREATE TABLE IF NOT EXISTS futures_data (id SERIAL PRIMARY KEY, symbol VARCHAR(20), price DECIMAL(15, 4), bid_price DECIMAL(15, 4), ask_price DECIMAL(15, 4), price_change DECIMAL(10, 4), price_change_percent DECIMAL(10, 4), timestamp TIMESTAMP, data_source VARCHAR(50), raw_data JSONB)`);
      await newClient.query(`CREATE TABLE IF NOT EXISTS stocks_data (id SERIAL PRIMARY KEY, symbol VARCHAR(20), sector VARCHAR(50), price DECIMAL(15, 4), bid_price DECIMAL(15, 4), ask_price DECIMAL(15, 4), price_change DECIMAL(10, 4), price_change_percent DECIMAL(10, 4), timestamp TIMESTAMP, data_source VARCHAR(50), raw_data JSONB)`);
      await newClient.query(`CREATE TABLE IF NOT EXISTS market_news (id SERIAL PRIMARY KEY, headline VARCHAR(500), summary TEXT, source VARCHAR(100), url VARCHAR(500), timestamp TIMESTAMP, data_source VARCHAR(50), raw_data JSONB)`);
      await newClient.query(`CREATE TABLE IF NOT EXISTS correlations (id SERIAL PRIMARY KEY, futures_symbol VARCHAR(20), stock_symbol VARCHAR(20), sector VARCHAR(50), timestamp TIMESTAMP)`);
      console.log('✅ Database setup completed successfully!');
      await newClient.end();
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  } catch (error) {
    console.error('Database setup error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
setupDatabase();
