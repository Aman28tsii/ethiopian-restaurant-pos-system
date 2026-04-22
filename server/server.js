import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { testConnection } from './src/config/database.js';
import { errorHandler, notFound } from './src/middleware/errorHandler.js';
import productRoutes from './src/routes/products.js';
import saleRoutes from './src/routes/sales.js';
import ingredientRoutes from './src/routes/ingredients.js';
import recipeRoutes from './src/routes/recipes.js';
import profitRoutes from './src/routes/profit.js';
import expenseRoutes from './src/routes/expenses.js';
import dashboardRoutes from './src/routes/dashboard.js';
import authRoutes from './src/routes/auth.js';
import orderRoutes from './src/routes/orders.js';
import tableRoutes from './src/routes/tables.js';
import waiterRoutes from './src/routes/waiter.js';
import kitchenRoutes from './src/routes/kitchen.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Allowed origins for CORS (add your production URLs here)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.CLIENT_URL,
  'https://ethiopos-frontend.netlify.app'
].filter(Boolean);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make io accessible to routes
app.set('io', io);

// Socket connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  socket.on('join_role', (role) => {
    socket.join(role);
    console.log(`Socket ${socket.id} joined ${role} room`);
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

const startServer = async () => {
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('Database connection failed');
    process.exit(1);
  }
  
  // Rate limiter
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    message: { success: false, error: 'Too many requests, please slow down.' },
    skipSuccessfulRequests: true,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, error: 'Too many login attempts, please try again later.' },
    skipSuccessfulRequests: true,
  });

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for development, enable in production with proper config
  }));
  
  // CORS middleware
  app.use(cors({ 
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(morgan('dev'));
  
  // Apply rate limiting
  app.use('/api/', limiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/signup', authLimiter);

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
  });
  
  // API Routes
  app.use('/api/products', productRoutes);
  app.use('/api/sales', saleRoutes);
  app.use('/api/ingredients', ingredientRoutes);
  app.use('/api/recipes', recipeRoutes);
  app.use('/api/profit', profitRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/tables', tableRoutes);
  app.use('/api/waiter', waiterRoutes);
  app.use('/api/kitchen', kitchenRoutes);

  // Error handling
  app.use(notFound);
  app.use(errorHandler);

  // Start server
  server.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`📦 Products API: http://localhost:${PORT}/api/products`);
    console.log(`💰 Sales API: http://localhost:${PORT}/api/sales`);
    console.log(`🍽️  Kitchen API: http://localhost:${PORT}/api/kitchen/orders`);
    console.log(`📋 Tables API: http://localhost:${PORT}/api/tables`);
    console.log(`🔌 WebSocket enabled - Real-time updates active`);
    console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
  });
};

startServer();