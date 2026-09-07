const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'kourosh_inventory.db');
const MIGRATION_FILE = path.join(__dirname, 'migrations', '2024-cart-sales.sql');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        return console.error('Could not connect to database', err.message);
    }
    console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    console.log(`Reading migration file: ${MIGRATION_FILE}`);
    const migrationSql = fs.readFileSync(MIGRATION_FILE, 'utf8');

    console.log('Executing migration...');
    db.exec(migrationSql, (err) => {
        if (err) {
            return console.error('Error running migration script:', err.message);
        }
        console.log("Migration from 2024-cart-sales.sql applied successfully.");
    });
});

db.close((err) => {
    if (err) {
        return console.error('Error closing the database connection:', err.message);
    }
    console.log('Closed the database connection.');
});
