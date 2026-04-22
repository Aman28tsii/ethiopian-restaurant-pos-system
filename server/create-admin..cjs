const bcrypt = require('bcrypt');
const hashedPassword = bcrypt.hashSync('admin123', 10);
console.log('Hashed Password:', hashedPassword);
// $2b$10$VLmGoRORqiVgLdj36gS4..xgMhH0hIkzUbbC47wNxXRvSahp6SL82
//$2b$10$D5HtIr1n1ahf0cDOxm.PWOGq5SZ6Q/8ENPFPKBaI7Vv1noVjZETf2 
// $2b$10$3nyzJoR4PUNtJMj7V5BJp.35p5R8joNl5RvB31augg7Swu6PiC0Ne