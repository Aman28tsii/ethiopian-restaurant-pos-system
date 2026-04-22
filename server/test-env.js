import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try different ways to load .env
console.log('Current directory:', __dirname);

// Try loading with explicit path
const result = dotenv.config({ path: path.join(__dirname, '.env') });
console.log('Dotenv result:', result.parsed ? 'Loaded' : 'Failed');

console.log('DATABASE_URL:', process.env.DATABASE_URL);