import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Determine if running in production (Render) or local
const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Add SSL only for production (Supabase requires it)
if (isProduction) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

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