# KITSflick

KITSflick is split into a `frontend` static app and a `backend` Express API, and the backend now uses PostgreSQL only.

## Run Locally

```bash
cd backend
npm install
# copy backend/.env.example to backend/.env and fill values
npm run migrate
npm start
```

Then open `http://localhost:3000`.

## PostgreSQL

- Use `backend/.env` for local development (copy from `backend/.env.example`)
- In production, prefer platform environment variables (`DATABASE_URL`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, etc.) instead of committing `.env`
- `npm run migrate` creates the target database if needed and applies the schema
- pgAdmin users can run `backend/database/schema.sql` directly in the Query Tool

## Structure

- `backend/server-pg.js` - application server
- `backend/db-pg.js` - PostgreSQL bootstrap and queries
- `backend/database/schema.sql` - reusable schema for pgAdmin and local bootstrap
- `frontend/` - static client files
