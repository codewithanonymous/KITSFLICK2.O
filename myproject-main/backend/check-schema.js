const { Pool } = require('pg');
require('dotenv').config();

async function checkSchema() {
    const pool = new Pool({
        user: process.env.PG_USER || 'postgres',
        host: process.env.PG_HOST || 'localhost',
        database: process.env.PG_DATABASE || 'snapchat_style_app',
        password: process.env.PG_PASSWORD || 'postgres',
        port: Number(process.env.PG_PORT || 5432),
    });

    const client = await pool.connect();

    try {
        console.log('Checking PostgreSQL schema...');

        const tables = ['users', 'snaps', 'hashtags', 'admin_users'];
        const existingTables = await client.query(
            `
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = ANY($1::text[])
                ORDER BY table_name
            `,
            [tables]
        );

        console.log('\nAvailable application tables:');
        console.table(existingTables.rows);

        const userColumns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'users'
            ORDER BY ordinal_position
        `);

        console.log('\nUsers table structure:');
        console.table(userColumns.rows);

        const snapColumns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'snaps'
            ORDER BY ordinal_position
        `);

        console.log('\nSnaps table structure:');
        console.table(snapColumns.rows);
    } catch (error) {
        console.error('Error checking schema:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSchema().catch(console.error);
