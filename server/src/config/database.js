import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// URL encode the password
const password = encodeURIComponent(process.env.DB_PASSWORD || '');
const user = process.env.DB_USER || 'postgres';
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 5432;
const database = process.env.DB_NAME || 'postgres';

const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=require`;

console.log('Connecting to database...');

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 30000,
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database error:', err.message);
    return false;
  }
};

export { pool };