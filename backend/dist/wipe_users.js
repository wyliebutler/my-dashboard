"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
async function wipeUsers() {
    try {
        await (0, database_1.initDb)();
        console.log('Deleting all users...');
        await (0, database_1.dbRun)('DELETE FROM users');
        console.log('All users deleted successfully.');
    }
    catch (err) {
        console.error('Error wiping users:', err);
        process.exit(1);
    }
}
wipeUsers();
