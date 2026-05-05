# FinAnalyzer – Bank Statement Analysis

A full-stack web application for intelligent bank statement analysis.

## Tech Stack
- **Frontend**: React + Vite + Recharts
- **Backend**: Node.js + Express
- **Database**: MySQL

## Quick Start

### 1. Database Setup
Open MySQL and run:
```sql
source backend/database/schema.sql
```

### 2. Backend Configuration
Edit `backend/.env`:
```
DB_PASSWORD=your_mysql_password
JWT_SECRET=change_this_to_a_secure_secret
```

### 3. Start Backend
```bash
cd backend
npm run dev
```

### 4. Start Frontend
```bash
cd frontend
npm run dev
```

App runs at: **http://localhost:5173**
API runs at: **http://localhost:5000**

## Features
- 🔐 JWT Authentication (Register / Login)
- 📄 PDF Bank Statement Upload
- 🤖 Auto Transaction Extraction & Categorization
- 📊 Dashboard with Summary Stats
- 🔍 Advanced Filtering & Search
- 📈 Charts: Bar, Line, Pie
- 📂 Upload History
- 👤 User Profile Management
