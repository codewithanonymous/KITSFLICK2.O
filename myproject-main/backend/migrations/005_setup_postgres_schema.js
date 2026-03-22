const db = require('../db-pg');

async function runMigration() {
    console.log('Applying PostgreSQL schema...');

    try {
        await db.initDb();
        console.log('Schema applied successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await db.pool.end().catch(() => {});
    }
}

runMigration();
