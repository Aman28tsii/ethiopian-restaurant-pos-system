// backend/scripts/generateHash.js
import bcrypt from 'bcryptjs';

const password = 'owner123';

async function generateHash() {
  const hash = await bcrypt.hash(password, 12);
  console.log('\n=================================');
  console.log('✅ NEW PASSWORD HASH GENERATED!');
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log('=================================\n');
  console.log('Copy this hash and run in Neon SQL Editor:');
  console.log(`UPDATE users SET password = '${hash}' WHERE email = 'owner@example.com';`);
}

generateHash();