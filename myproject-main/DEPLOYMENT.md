# Deployment (Render + Supabase + Vercel)

## 1) Supabase (PostgreSQL)

1. Create a Supabase project.
2. In Supabase, open `Project Settings -> Database`.
3. Copy your PostgreSQL connection string.
4. Use the connection string as `DATABASE_URL` in Render.

## 2) Backend on Render

This repo includes `render.yaml` for backend deploy from `backend/`.

Required environment variables in Render:

- `DATABASE_URL` = your Supabase PostgreSQL URL
- `JWT_SECRET` = long random secret
- `CORS_ALLOWED_ORIGINS` = your Vercel domain(s), comma-separated
- `ADMIN_USERNAME` = default admin username
- `ADMIN_PASSWORD` = default admin password
- `NODE_ENV=production`
- `PG_SSL_MODE=require`

Build/Start:

- Build Command: `npm install`
- Start Command: `npm start`

## 3) Run migrations against Supabase

Run once with production database URL:

```bash
cd backend
set DATABASE_URL=YOUR_SUPABASE_DATABASE_URL
set PG_SSL_MODE=require
npm run migrate
```

## 4) Frontend on Vercel

Create a Vercel project using `frontend/` as Root Directory.

Set environment variables in Vercel:

- `VITE_API_BASE_URL` = your Render backend URL (example: `https://kitsflick-backend.onrender.com`)
- `VITE_SOCKET_URL` = same Render backend URL

Then deploy.

This repo includes `frontend/vercel.json` to support client-side routing refresh.
