# 🍽️ EthioPOS - Ethiopian Restaurant POS System

A complete, production-ready Point of Sale system designed specifically for Ethiopian restaurants with 5 role-based interfaces.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Roles & Credentials](#roles--credentials)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## ✨ Features

### Role-Based System (5 Roles)
| Role | Access |
|------|--------|
| **Owner** | Full control, reports, staff management, expenses, inventory |
| **Manager** | Inventory, sales reports, profit tracking, operations |
| **Cashier** | POS terminal, payment processing, sales history |
| **Waiter** | Table management, order taking, send to kitchen |
| **Kitchen** | Order display, status updates (preparing/ready) |

### Core Features
- ✅ Real-time WebSocket updates between Waiter → Kitchen → Cashier
- ✅ Table management with automatic status (available/occupied)
- ✅ Inventory management with stock adjustment (+/- buttons)
- ✅ Low stock alerts with notifications
- ✅ Expense tracking with category breakdown
- ✅ Profit reports with daily breakdown
- ✅ Staff performance tracking
- ✅ Export reports to Excel and PDF
- ✅ Dashboard charts (revenue, top products, payment methods)
- ✅ Order cancellation with reason
- ✅ Responsive design (Mobile, Tablet, Desktop)

## 🛠️ Tech Stack

### Backend
- **Node.js** (v18+)
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Socket.io** - Real-time updates
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **React 18** - UI framework
- **Tailwind CSS** - Styling
- **Recharts** - Charts and graphs
- **Socket.io-client** - Real-time communication
- **Axios** - HTTP client
- **React Router v6** - Routing
- **Lucide React** - Icons

### Additional Libraries
- **xlsx** - Excel export
- **jspdf** + **jspdf-autotable** - PDF export
- **express-rate-limit** - Rate limiting
- **helmet** - Security headers
- **cors** - Cross-origin support

## 📥 Installation

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/ethiopian-restaurant-pos-system.git
cd ethiopian-restaurant-pos-system

cd server
npm install

cd ../client
npm install

# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE restaurant_pos_db;

# Connect to database
\c restaurant_pos_db

# Run schema (create tables)
# Copy and paste the SQL schema from below

PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=restaurant_pos_db
JWT_SECRET=your_secret_key_here

Create .env file in client/ folder:

env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
🚀 Running the Application
Start Backend Server
bash
cd server
npm run dev
Server runs on: http://localhost:5000

Start Frontend Application
bash
cd client
npm start
Application runs on: http://localhost:3000

👥 Roles & Credentials
Role	Email	Password
Owner	admin@example.com	admin123
Manager	manager@example.com	admin123
Cashier	cashier@example.com	admin123
Waiter	waiter@example.com	admin123
Kitchen	kitchen@example.com	admin123
🔄 Complete Order Flow
text
1. WAITER                   2. KITCHEN                  3. CASHIER
   ↓                           ↓                           ↓
Select Table              See Order                   Ready Order
Add Items                  ↓                           ↓
Send to Kitchen    →   Start Cooking          →   Process Payment
                        ↓                           ↓
                     Mark Ready                  Sale Recorded
                                                  Table Freed
📁 Project Structure
text
ethiopian-restaurant-pos-system/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── expenseController.js
│   │   │   ├── ingredientController.js
│   │   │   ├── kitchenController.js
│   │   │   ├── productController.js
│   │   │   ├── profitController.js
│   │   │   ├── recipeController.js
│   │   │   ├── saleController.js
│   │   │   ├── tableController.js
│   │   │   └── waiterController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── errorHandler.js
│   │   │   └── validation.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── dashboard.js
│   │   │   ├── expenses.js
│   │   │   ├── ingredients.js
│   │   │   ├── inventory.js
│   │   │   ├── kitchen.js
│   │   │   ├── orders.js
│   │   │   ├── products.js
│   │   │   ├── profit.js
│   │   │   ├── recipes.js
│   │   │   ├── sales.js
│   │   │   ├── tables.js
│   │   │   └── waiter.js
│   │   └── services/
│   │       └── orderService.js
│   ├── .env
│   ├── package.json
│   └── server.js
└── client/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── api/
    │   │   └── axios.js
    │   ├── components/
    │   │   ├── Charts.js
    │   │   ├── ExportButtons.js
    │   │   ├── LowStockAlert.js
    │   │   ├── ResponsiveTable.js
    │   │   ├── Sidebar.js
    │   │   ├── StaffPerformance.js
    │   │   └── Topbar.js
    │   ├── layouts/
    │   │   ├── OwnerLayout.js
    │   │   ├── ManagerLayout.js
    │   │   ├── CashierLayout.js
    │   │   ├── WaiterLayout.js
    │   │   └── KitchenLayout.js
    │   ├── pages/
    │   │   ├── cashier/
    │   │   │   └── CashierPOS.js
    │   │   ├── kitchen/
    │   │   │   └── KitchenDashboard.js
    │   │   ├── manager/
    │   │   │   └── ManagerDashboard.js
    │   │   ├── owner/
    │   │   │   └── OwnerDashboard.js
    │   │   ├── waiter/
    │   │   │   └── TableGrid.js
    │   │   ├── Dashboard.js
    │   │   ├── Expenses.js
    │   │   ├── Inventory.js
    │   │   ├── Login.js
    │   │   ├── PendingApprovals.js
    │   │   ├── POS.js
    │   │   ├── ProfitReports.js
    │   │   ├── Recipes.js
    │   │   ├── Signup.js
    │   │   └── Staff.js
    │   ├── App.js
    │   ├── index.css
    │   ├── index.js
    │   └── socket.js
    ├── .env
    ├── package.json
    └── tailwind.config.js
🗄️ Database Schema
Main Tables
users - Staff accounts with roles

tables - Restaurant tables (1-10)

products - Menu items

ingredients - Inventory items

recipes - Product-ingredient relationships

orders - Customer orders

order_items - Items per order

kitchen_orders - Kitchen queue

sales - Completed sales

sale_items - Items per sale

expenses - Business expenses

🚢 Deployment
Deploy Backend to Render
bash
# Push code to GitHub
git push origin main

# On Render.com:
# - New Web Service
# - Connect GitHub repo
# - Build Command: npm install
# - Start Command: npm start
# - Add environment variables
Deploy Frontend to Netlify
bash
cd client
npm run build
# Drag 'build' folder to netlify.com
Deploy Database to Supabase
bash
# Create Supabase project
# Copy database URL
# Update DATABASE_URL in .env
🔧 Troubleshooting
Common Issues & Solutions
Issue	Solution
Database connection failed	Check PostgreSQL is running: pg_ctl status
Port 5000 already in use	Change PORT in .env or kill process
WebSocket 404 error	Ensure socket.io is installed and server restarted
429 Too Many Requests	Adjust rate limiter in server.js
CORS error	Check CLIENT_URL in .env matches frontend URL
Reset Database
sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Re-run schema
Clear Node Modules Cache
bash
rm -rf node_modules package-lock.json
npm install
📝 API Endpoints
Authentication
Method	Endpoint	Description
POST	/api/auth/login	User login
POST	/api/auth/signup	Register new user
GET	/api/auth/me	Get current user
Orders (Waiter)
Method	Endpoint	Description
POST	/api/waiter/orders	Create order
GET	/api/waiter/orders	Get waiter's orders
PUT	/api/orders/:id/cancel	Cancel order
Kitchen
Method	Endpoint	Description
GET	/api/kitchen/orders	Get pending orders
PUT	/api/kitchen/orders/:id/status	Update status
Sales (Cashier)
| POST | /api/sales | Process sale |
| GET | /api/sales/today | Today's sales |

Inventory
| GET | /api/ingredients | Get all ingredients |
| PUT | /api/ingredients/:id/stock | Adjust stock |

📄 License
MIT License - Free for commercial and personal use.

👨‍💻 Author
EthioPOS - Ethiopian Restaurant POS System

🙏 Support
For support, email: support@ethiopos.com

Built with ❤️ for Ethiopian Restaurants

text

---

## 📋 Installation Commands Summary

### Backend Setup
```bash
cd server
npm install
npm run dev
Frontend Setup
bash
cd client
npm install
npm start
Database Setup
bash
psql -U postgres
CREATE DATABASE restaurant_pos_db;
\c restaurant_pos_db
-- Run SQL schema
All files are ready! Copy and save them to your project. 🚀

