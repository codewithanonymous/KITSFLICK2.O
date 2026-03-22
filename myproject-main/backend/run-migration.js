const db = require('./db-pg');

async function runMigrations() {
    console.log('Ensuring PostgreSQL database and schema are ready...');

    try {
        await db.initDb();
        console.log('PostgreSQL schema is ready.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } finally {
        try {
            await db.pool.end();
        } catch (poolError) {
            console.error('Error while closing DB pool:', poolError.message);
        }
    }
}

runMigrations();
