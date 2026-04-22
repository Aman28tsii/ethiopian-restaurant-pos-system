import bcrypt from 'bcryptjs';

const password = 'admin123';
const salt = await bcrypt.genSalt(12);
const hash = await bcrypt.hash(password, salt);
console.log('Password:', password);
console.log('Hash:', hash);

// Verify
const verify = await bcrypt.compare(password, hash);
console.log('Verify works:', verify);

// $2a$12$Jk1ket/d86MqEqqVEVH7uOHsVbRdpoVGHmBh27Ol/DVqn.1KEuGMe