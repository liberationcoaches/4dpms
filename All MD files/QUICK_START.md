# Quick Start - Preview the App

## Step 1: Install Dependencies

```bash
npm install
```

This will install all dependencies for both client and server.

## Step 2: Set Up Environment Variables

Create `server/.env` file with:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/performance-management
NODE_ENV=development
```

**Note:** If MongoDB is not running locally, you can:
- Install MongoDB locally, OR
- Use MongoDB Atlas (free tier) and update the connection string

## Step 3: Start the Preview

### Option A: Run Both Together (Recommended)
```bash
npm run dev
```

This starts:
- **Server**: http://localhost:3000
- **Client**: http://localhost:5173

### Option B: Run Separately

**Terminal 1 - Server:**
```bash
npm run dev:server
```

**Terminal 2 - Client:**
```bash
npm run dev:client
```

## Step 4: Access the Preview

Once running, open your browser:

1. **Sign Up Page**: http://localhost:5173/auth/signup
2. **Demo Page**: http://localhost:5173/demo/auth
3. **Home**: http://localhost:5173/

## Step 5: (Optional) Seed Database

In a new terminal:
```bash
cd server
npm run seed
```

This creates 11 test users with various verification states.

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Or update `MONGODB_URI` in `server/.env` to your MongoDB connection string
- For quick testing without MongoDB, you can temporarily comment out the database connection in `server/src/index.ts` (not recommended for production)

### Port Already in Use
- Change `PORT` in `server/.env` or `client/vite.config.ts`

### Dependencies Issues
```bash
# Clean install
rm -rf node_modules client/node_modules server/node_modules
npm install
```

