# Cloudflare Deployment Guide

This guide details how to deploy your React Frontend and FastAPI Backend. 
Since Cloudflare Pages is exclusively for static sites and Jamstack architectures, it's perfect for the **Frontend**. 
Your **FastAPI Backend** with SQLite will need to be hosted on a service like Render, Railway, fly.io, or an AWS EC2 instance, because it requires a persistent Python environment and a written filesystem for the SQLite database.

## Phase 1: Deploying the Backend (e.g., Render)

1. Create a free account on [Render.com](https://render.com/).
2. Create a **New Web Service**.
3. Connect your GitHub repository.
4. Set the Root Directory to `.antigravity/backend` (or wherever your backend actually lives relative to the git root).
5. **Build Command:** `pip install -r requirements.txt` *(Note: ensure you have a `requirements.txt` with `fastapi`, `uvicorn`, `python-dotenv`, `bcrypt`, `pyjwt`, `requests`)*
6. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`
7. **Environment Variables:**
   - Add `OPENROUTER_API_KEY` with your key.
   - Add `JWT_SECRET` with a secure random string.
8. Deploy it. Note the resulting URL (e.g., `https://ai-debater-backend.onrender.com`).

## Phase 2: Preparing Frontend for Cloudflare Pages

Before deploying to Cloudflare Pages, the frontend needs to know where the backend lives.
Currently, the React app uses relative paths (e.g., `fetch('/api/chat/start')`) assuming it relies on a local proxy or the FastAPI serving static files. 

If you split the frontend and backend, you must:
1. Hardcode the backend URL or use Vite environment variables. 
   - **Example**: Create `.antigravity/frontend/.env` with `VITE_API_BASE_URL=https://ai-debater-backend.onrender.com`
   - Prepend all fetch calls in your React code with `import.meta.env.VITE_API_BASE_URL` (e.g., `fetch(import.meta.env.VITE_API_BASE_URL + '/api/chats/history')`).
*(If you want to keep them together, see the **Alternative** section below).*

## Phase 3: Deploying Frontend to Cloudflare Pages

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages**.
3. Click **Create Application** -> **Pages** -> **Connect to Git**.
4. Select your AI Debater repository.
5. Setup the build settings:
   - **Framework preset:** `React` or `Vite` (Vite is recommended if using Vite).
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `.antigravity/frontend` (path inside the repo)
6. **Environment Variables:**
   - Add `NODE_VERSION` and set it to `18` or `20`.
   - Add any `VITE_...` variables needed to connect to your deployed backend.
7. Click **Save and Deploy**.

## Alternative: All-in-One Deployment (No Cloudflare Pages)

Since your `main.py` is already configured to serve the React `dist` folder:
`app.mount("/assets", ...)`
`@app.get("/{full_path:path}")`

You can just build the React app once locally (`cd frontend && npm run build`), push the entire repo to a VPS (like a DigitalOcean droplet) or a PaaS (like Render), and run the Python app. The Python app will serve both the backend API and the compiled React frontend from one domain.

If you choose this route, no changes to `fetch()` calls are necessary. 
