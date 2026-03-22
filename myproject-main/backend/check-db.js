const { Pool } = require('pg');
require('dotenv').config();

async function checkDb() {
    const pool = new Pool({
        user: process.env.PG_USER || 'postgres',
        host: process.env.PG_HOST || 'localhost',
        database: process.env.PG_DATABASE || 'snapchat_style_app',
        password: process.env.PG_PASSWORD || 'postgres',
        port: Number(process.env.PG_PORT || 5432),
    });

    const client = await pool.connect();

    try {
        const counts = await client.query(`
            SELECT
                (SELECT COUNT(*) FROM users) AS users,
                (SELECT COUNT(*) FROM snaps) AS snaps,
                (SELECT COUNT(*) FROM hashtags) AS hashtags,
                (SELECT COUNT(*) FROM admin_users) AS admin_users
        `);

        console.log('PostgreSQL row counts:');
        console.table(counts.rows);
    } finally {
        client.release();
        await pool.end();
    }
}

checkDb().catch((error) => {
    console.error('Failed to inspect PostgreSQL database:', error);
    process.exit(1);
});
