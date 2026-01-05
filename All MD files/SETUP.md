# Setup Instructions

## Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   
   Create `server/.env` file:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/performance-management
   NODE_ENV=development
   ```

3. **Start MongoDB:**
   - Ensure MongoDB is running locally, or
   - Update `MONGODB_URI` in `server/.env` with your connection string

## Development

### Run Both Client and Server
```bash
npm run dev
```

### Run Separately

**Client only:**
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

**Server only:**
```bash
cd server
npm run dev
# Runs on http://localhost:3000
```

## Testing

### Run All Tests
```bash
npm test
```

### Client Tests
```bash
cd client
npm test
npm run test:coverage  # With coverage report
```

### Server Tests
```bash
cd server
npm test
npm run test:coverage  # With coverage report
```

## Database Seeding

```bash
cd server
npm run seed
```

## Building for Production

```bash
npm run build
```

## Project Structure

```
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── __tests__/      # Test files
│   │   └── ...
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Pure calculation functions
│   │   ├── __tests__/      # Test files
│   │   └── ...
│   └── ...
└── package.json            # Root workspace config
```

## Next Steps

When you send a Figma image, the following will be implemented:

1. React component(s) with CSS modules
2. Express routes and controllers
3. Mongoose schemas with validation
4. Pure calculation functions matching Excel formulas
5. Comprehensive Jest tests
6. API documentation
7. Seed data fixtures
8. Demo page or Storybook story

