# People-Performance Management App

Monorepo structure for Performance Management application.

## Structure

```
├── client/          # React + Vite + TypeScript
├── server/          # Node + Express + TypeScript
└── package.json     # Root workspace config
```

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- MongoDB (local or connection string)

### Installation

```bash
npm install
```

### Development

Run both client and server:
```bash
npm run dev
```

Run separately:
```bash
npm run dev:client  # Client on http://localhost:5173
npm run dev:server  # Server on http://localhost:3000
```

### Build

```bash
npm run build
```

### Testing

```bash
npm test
```

## Tech Stack

**Client:**
- React 18
- Vite
- TypeScript
- React Router v6
- CSS Modules

**Server:**
- Node.js
- Express
- TypeScript
- MongoDB + Mongoose
- Zod/Joi validation

**Testing:**
- Jest
- React Testing Library
- Supertest

