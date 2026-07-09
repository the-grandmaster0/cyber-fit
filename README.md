
# Workout Plan Generator

A full-stack workout plan generator application built as a monorepo.

## Project Structure

```
genai-app/
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/          # Express backend
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── .env.example
│   ├── app.js
│   ├── package.json
│   └── server.js
├── .prettierignore
├── .prettierrc
├── package.json
└── README.md
```

## Installation

```bash
npm install
```

## Environment Variables

Copy the `.env.example` files to `.env` and fill in the required values.

### Server (server/.env)
```
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Client (client/.env)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_GOOGLE_CLIENT_ID=
```

## Running the Development Environment

```bash
npm run dev
```

This will start:
- Express server on http://localhost:3001
- Vite client on http://localhost:5173

## Available npm scripts

### Root
- `npm run dev`: Start both client and server concurrently
- `npm run build`: Build the client
- `npm run lint`: Lint all files
- `npm run format`: Format all files

### Client
- `npm run dev`: Start Vite dev server
- `npm run build`: Build for production
- `npm run preview`: Preview production build

### Server
- `npm run dev`: Start Express with nodemon-like watch
- `npm run start`: Start Express in production mode

