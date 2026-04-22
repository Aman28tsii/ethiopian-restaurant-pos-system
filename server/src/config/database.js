import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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