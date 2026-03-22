# Marriage Hall Booking System

A simple web app to book marriage halls. Data is saved in PostgreSQL.

## Deploy to Railway (Free — Recommended)

### Step 1: Create a GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (e.g., hall-booking-app)
3. Upload all files from this folder to the repository

### Step 2: Deploy on Railway
1. Go to https://railway.app and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub Repo"
3. Select your hall-booking-app repository
4. Railway will auto-detect Node.js and start building

### Step 3: Add PostgreSQL Database
1. In your Railway project, click "+ New" → "Database" → "PostgreSQL"
2. Railway automatically sets the DATABASE_URL environment variable
3. The app will auto-create tables on first run

### Step 4: Get Your Link
1. Go to your app service → Settings → Networking
2. Click "Generate Domain"
3. You'll get a link like: https://hall-booking-app-xxxx.up.railway.app
