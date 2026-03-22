# PostgreSQL Setup Guide

## Local Setup

1. Install PostgreSQL and start the service.
2. Update `backend/.env` with your PostgreSQL credentials.
3. Run:

```bash
cd backend
npm install
npm run migrate
npm start
```

The backend will create or update the PostgreSQL schema automatically.

## pgAdmin

If you prefer to initialize the schema from pgAdmin:

1. Create or open the `snapchat_style_app` database.
2. Open Query Tool.
3. Run the SQL from `backend/database/schema.sql`.
4. Start the backend once so the default admin account is seeded from `.env`.

## What The Schema Includes

- User accounts with secure password storage
- Separate admin accounts with role and permissions fields
- Shared posts/feed records for media posts, text posts, and notices
- Organizations for clubs, associations, and departments
- Hashtags and post relationships for future expansion

## Troubleshooting

- Make sure PostgreSQL is listening on the host and port from `.env`
- Run `npm run migrate` after schema changes
- Use `node check-schema.js` to inspect the current tables
