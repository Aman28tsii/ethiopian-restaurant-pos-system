import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import dns from 'dns';

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

// Get the IPv4 address of the host
const getHostIPv4 = (host) => {
  // For Supabase, use the IPv4 address directly
  if (host === 'db.wjmtebskystarerhfvcc.supabase.co') {
    return '54.255.0.0'; // You may need to find the actual IP
  }
  return host;
};

const pool = new Pool({
  host: 'db.wjmtebskystarerhfvcc.supabase.co',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'postgres',
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