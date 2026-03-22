# KITSflick PostgreSQL Setup

This project now uses PostgreSQL only. SQLite has been removed from the supported backend flow.

## Local Setup

1. Copy `backend/.env.example` to `backend/.env`, then set your PostgreSQL credentials.
2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Create the database and apply the schema:

```bash
npm run migrate
```

4. Start the backend:

```bash
npm start
```

The app will be available at `http://localhost:3000`.

## Production Notes

- Do not rely on a committed `.env` file in production.
- Set environment variables in your hosting platform.
- The backend supports both:
  - `DATABASE_URL` (recommended for hosted PostgreSQL)
  - Individual `PG_*` variables
- Set `CORS_ALLOWED_ORIGINS` as a comma-separated list of allowed frontend origins.

## pgAdmin Schema Import

If you want to create the schema directly in pgAdmin:

1. Create or open the `snapchat_style_app` database in pgAdmin.
2. Open the Query Tool.
3. Run the SQL from `backend/database/schema.sql`.
4. Start the backend once so the admin user from `.env` is seeded.

## Important Files

- `backend/server-pg.js` - Express API and app server
- `backend/db-pg.js` - PostgreSQL connection and bootstrap logic
- `backend/database/schema.sql` - pgAdmin-friendly schema script
- `backend/run-migration.js` - local schema bootstrap command
- `backend/check-schema.js` - quick schema inspection helper
