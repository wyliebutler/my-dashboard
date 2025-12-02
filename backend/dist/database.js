"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbRun = dbRun;
exports.initDb = initDb;
exports.getDb = getDb;
const sqlite3_1 = __importDefault(require("sqlite3"));
const verboseSqlite = sqlite3_1.default.verbose();
const DB_PATH = '/app/data/dashboard.db';
let db;
// Promisified version of db.run
function dbRun(sql, params = []) {
    // Ensure db is initialized
    if (!db) {
        return Promise.reject(new Error("Database not initialized. Call initDb() first."));
    }
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
// Function to initialize the database
async function initDb() {
    return new Promise((resolve, reject) => {
        db = new verboseSqlite.Database(DB_PATH, (err) => {
            if (err) {
                console.error(`Error opening database at ${DB_PATH}:`, err.message);
                return reject(err);
            }
            console.log(`Connected to the SQLite database at ${DB_PATH}`);
            // Use db.serialize to ensure table creation is sequential and ordered
            db.serialize(() => {
                // 1. Create users table
                db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
          )`, (err) => {
                    if (err) {
                        console.error('Error creating users table:', err.message);
                        return reject(err);
                    }
                });
                // 2. Create groups table
                db.run(`CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            name TEXT NOT NULL,
            position INTEGER,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
          )`, (err) => {
                    if (err) {
                        console.error('Error creating groups table:', err.message);
                        return reject(err);
                    }
                });
                // 3. Create tiles table
                db.run(`CREATE TABLE IF NOT EXISTS tiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            groupId INTEGER,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            icon TEXT NOT NULL,
            position INTEGER,
            FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (groupId) REFERENCES groups (id) ON DELETE SET NULL
          )`, (err) => {
                    if (err) {
                        console.error('Error creating tiles table:', err.message);
                        return reject(err);
                    }
                });
                // 4. Run a final command. Its callback will run *after* all previous
                //    commands are complete. This is how we know it's safe to resolve.
                db.run('PRAGMA user_version = 1', (err) => {
                    if (err) {
                        console.error('Error finalizing tables:', err.message);
                        return reject(err);
                    }
                    console.log('Database tables checked/created successfully.');
                    resolve();
                });
            });
        });
    });
}
// Function to get the database instance
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDb() first.');
    }
    return db;
}
