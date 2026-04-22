import bcrypt from 'bcrypt';
const pw = process.argv[2];
if (!pw) { console.log('Usage: node hash.js <password>'); process.exit(1); }
console.log(bcrypt.hashSync(pw, 10));
