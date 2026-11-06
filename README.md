# AI Voice Agent

A beginner-friendly starter project for an AI Voice Agent.

This project currently contains **only the foundation**: a React frontend and a
Node.js + Express backend. Voice functionality and AI integration will be added
in later steps.

## Tech stack

| Layer    | Technology               |
| -------- | ------------------------ |
| Frontend | React.js + Vite          |
| Backend  | Node.js + Express.js     |
| Language | JavaScript               |
| Styling  | Plain CSS                |

## Project structure

```
ai-voice-agent/
├── .gitignore                 # Ignores dependencies, build output, env files, logs
├── README.md                  # This file
│
├── frontend/                  # React app (Vite)
│   ├── .gitignore
│   ├── index.html             # HTML entry point, page title: "AI Voice Agent"
│   ├── package.json           # Frontend scripts and dependencies
│   ├── vite.config.js         # Vite + React plugin configuration
│   ├── public/
│   │   └── favicon.svg        # Small microphone icon
│   └── src/
│       ├── main.jsx           # React entry point, mounts <App />
│       ├── App.jsx            # Welcome page
│       ├── App.css            # Styles for the welcome page
│       ├── index.css          # Global styles and CSS variables
│       └── components/
│           └── WelcomeCard.jsx # Small reusable card component
│
└── backend/                   # Express API
    ├── .gitignore
    ├── package.json           # Backend scripts and dependencies
    └── src/
        ├── server.js          # Starts the server on port 5000
        ├── app.js             # Express app, middleware and route mounting
        └── routes/
            └── health.routes.js # GET /api/health
```

### Why this structure?

- `frontend/` and `backend/` are independent applications, so they can be
  started, installed and deployed separately.
- The backend separates **starting the server** (`server.js`) from **building
  the app** (`app.js`). This is a common pattern that makes testing easier later.
- API routes live in their own folder (`routes/`) so new endpoints can be added
  without making one large file.
- Components live in `src/components/` so the frontend stays organized as it grows.

## Requirements

- Node.js 20 or newer (Node.js 22 recommended; the project uses Node's built-in
  `--watch` mode for auto-restart)
- npm (installed together with Node.js)

Check your versions:

```bash
node --version
npm --version
```

## Installation

Dependencies must be installed once for each folder.

### 1. Frontend

```bash
cd frontend
npm install
```

### 2. Backend

Open a second terminal:

```bash
cd backend
npm install
```

## Running the project

The frontend and backend run as two separate processes, so use **two terminals**.

### Terminal 1 - Frontend

```bash
cd frontend
npm run dev
```

The app opens at **http://localhost:5173** (Vite opens it automatically).

### Terminal 2 - Backend

```bash
cd backend
npm run dev
```

The API runs at **http://localhost:5000** and restarts automatically when files
change (using Node.js built-in watch mode).

## Testing the backend

Open the health-check URL in a browser:

```
http://localhost:5000/api/health
```

Or use curl:

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "message": "AI Voice Agent backend is running",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "uptime": "3s"
}
```

## Available scripts

### Frontend (`frontend/`)

| Command           | Description                            |
| ----------------- | -------------------------------------- |
| `npm run dev`     | Start the Vite development server      |
| `npm run build`   | Create an optimized production build   |
| `npm run preview` | Preview the production build locally   |

### Backend (`backend/`)

| Command         | Description                                      |
| --------------- | ------------------------------------------------ |
| `npm run dev`   | Start Express with auto-restart on file changes  |
| `npm start`     | Start Express once with plain Node.js            |

## Configuration

- Frontend port: `5173` (see `frontend/vite.config.js`)
- Backend port: `5000` (see `backend/src/server.js`)
- To use a different backend port, set the `PORT` environment variable before
  starting the server.

## Notes for next steps

The frontend and backend are not connected yet. When you are ready to add API
calls, you can either:

1. Add a Vite proxy in `frontend/vite.config.js`, or
2. Add the `cors` package to the backend.

Voice capture, speech-to-text, AI responses and text-to-speech are intentionally
**not** implemented in this setup.
