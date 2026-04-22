import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: 'postgres',
  password: 'postgres123',
  host: 'localhost',
  port: 5432,
  database: 'restaurant_pos_db',
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
export const testConnection = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected');
    return true;
  } catch (err) {
    console.error('Database error:', err.message);
    return false;
  }
};
export { pool };