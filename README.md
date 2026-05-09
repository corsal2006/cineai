# CineAI

CineAI is a React + Vite movie discovery app with AI-powered recommendations, Firebase authentication, TMDB movie data, and shared watch rooms.

Live app: [https://cine-ai-plum.vercel.app/](https://cine-ai-plum.vercel.app/)

## Features

- Sign in with Firebase email/password or Google authentication
- Browse trending, action, horror, sci-fi, comedy, Bollywood, and anime rows
- Search movies through TMDB
- Get AI movie suggestions through Groq
- Learn from local search and click history to recommend movies based on taste
- Create or join watch rooms with synced trailer playback and realtime chat

## Tech Stack

- React 19
- Vite
- Firebase Auth and Realtime Database
- TMDB API
- Groq SDK
- Framer Motion
- React Router

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local `.env` file from the example:

```bash
cp .env.example .env
```

Add your API keys:

```bash
VITE_GROQ_KEY=your_groq_api_key
VITE_TMDB_KEY=your_tmdb_api_key
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deployment

This project is deployed on Vercel:

[https://cine-ai-plum.vercel.app/](https://cine-ai-plum.vercel.app/)
