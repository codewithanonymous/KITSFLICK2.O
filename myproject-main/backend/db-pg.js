const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const DEFAULT_APP_DATABASE = 'snapchat_style_app';
const DEFAULT_ADMIN_DATABASE = 'postgres';
const DEFAULT_ADMIN_USERNAME = 'amixuser@123';
const DEFAULT_ADMIN_PASSWORD = 'amixuser@123';
const SCHEMA_PATH = path.join(__dirname, 'database', 'schema.sql');

const parseSslEnabled = () => {
    const sslMode = (process.env.PG_SSL_MODE || '').trim().toLowerCase();
    if (sslMode === 'disable') {
        return false;
    }
    if (sslMode === 'require') {
        return true;
    }
    return process.env.NODE_ENV === 'production';
};

const getConnectionConfig = (database = process.env.PG_DATABASE || DEFAULT_APP_DATABASE) => {
    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: {
                require: true,
                rejectUnauthorized: false,
            },
        };
    }

    return {
        user: process.env.PG_USER || 'postgres',
        host: process.env.PG_HOST || 'localhost',
        database,
        password: process.env.PG_PASSWORD || 'postgres',
        port: Number(process.env.PG_PORT || 5432),
        ssl: parseSslEnabled() ? { rejectUnauthorized: false } : false,
    };
};

const pool = new Pool(getConnectionConfig());

const ensureDatabaseExists = async () => {
    if (process.env.DATABASE_URL) {
        return;
    }

    const targetDb = process.env.PG_DATABASE || DEFAULT_APP_DATABASE;
    const safeDbName = /^[a-zA-Z0-9_]+$/.test(targetDb) ? targetDb : null;

    if (!safeDbName) {
        throw new Error(`Invalid database name: ${targetDb}`);
    }

    const adminPool = new Pool(
        getConnectionConfig(process.env.PG_DEFAULT_DATABASE || DEFAULT_ADMIN_DATABASE)
    );

    try {
        const existsResult = await adminPool.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [safeDbName]
        );

        if (existsResult.rows.length === 0) {
            await adminPool.query(`CREATE DATABASE "${safeDbName}"`);
            console.log(`Created PostgreSQL database: ${safeDbName}`);
        }
    } finally {
        await adminPool.end();
    }
};

const loadSchemaSql = () => fs.readFileSync(SCHEMA_PATH, 'utf8');

const seedAdminUser = async (client) => {
    const adminUsername = process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await client.query(
        `
            INSERT INTO admin_users (username, password_hash, is_active)
            VALUES ($1, $2, true)
            ON CONFLICT (username)
            DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                is_active = true
        `,
        [adminUsername, passwordHash]
    );

    console.log(`Admin user is ready: ${adminUsername}`);
};

const initDb = async () => {
    await ensureDatabaseExists();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(loadSchemaSql());
        await seedAdminUser(client);
        await client.query('COMMIT');
        console.log('PostgreSQL schema initialized');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error initializing PostgreSQL schema:', error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(),
    getConnectionConfig,
    pool,
    initDb,
};
