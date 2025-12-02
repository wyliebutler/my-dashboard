"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = express_1.default.Router();
// Export Backup
router.get('/export', authMiddleware_1.default, (req, res) => {
    if (!req.user)
        return res.sendStatus(401);
    const userId = req.user.id;
    const db = (0, database_1.getDb)();
    let backupData = {
        groups: [],
        tiles: []
    };
    db.all('SELECT * FROM groups WHERE userId = ?', [userId], (err, groups) => {
        if (err)
            return res.status(500).json({ message: 'Error fetching groups for export', error: err.message });
        backupData.groups = groups;
        db.all('SELECT * FROM tiles WHERE userId = ?', [userId], (err, tiles) => {
            if (err)
                return res.status(500).json({ message: 'Error fetching tiles for export', error: err.message });
            backupData.tiles = tiles;
            // Send the backup data as a JSON response
            res.json(backupData);
        });
    });
});
// Import Backup
router.post('/import', authMiddleware_1.default, (req, res) => {
    if (!req.user)
        return res.sendStatus(401);
    const userId = req.user.id;
    const { groups, tiles } = req.body;
    // Basic validation
    if (!Array.isArray(groups) || !Array.isArray(tiles)) {
        return res.status(400).json({ message: 'Invalid backup file format.' });
    }
    const db = (0, database_1.getDb)();
    const oldToNewGroupIdMap = new Map();
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        // 1. Clear existing user data
        db.run('DELETE FROM tiles WHERE userId = ?', [userId], (err) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ message: 'Failed to clear old tiles', error: err.message });
            }
        });
        db.run('DELETE FROM groups WHERE userId = ?', [userId], (err) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ message: 'Failed to clear old groups', error: err.message });
            }
        });
        // 2. Insert groups and map old IDs to new IDs
        const groupStmt = db.prepare('INSERT INTO groups (userId, name, position) VALUES (?, ?, ?)');
        groups.forEach(group => {
            groupStmt.run(userId, group.name, group.position, function (err) {
                if (err) {
                    console.error('Error inserting group:', err);
                    // We can't easily roll back from inside a forEach, so we'll rely on the finalize check
                }
                oldToNewGroupIdMap.set(group.id, this.lastID);
            });
        });
        groupStmt.finalize((err) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ message: 'Failed to insert groups', error: err.message });
            }
            // 3. Insert tiles, using the new group IDs
            const tileStmt = db.prepare('INSERT INTO tiles (userId, groupId, name, url, icon, position) VALUES (?, ?, ?, ?, ?, ?)');
            tiles.forEach(tile => {
                const newGroupId = tile.groupId ? oldToNewGroupIdMap.get(tile.groupId) : null;
                tileStmt.run(userId, newGroupId, tile.name, tile.url, tile.icon, tile.position);
            });
            tileStmt.finalize((err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ message: 'Failed to insert tiles', error: err.message });
                }
                // 4. Commit
                db.run('COMMIT', (err) => {
                    if (err)
                        return res.status(500).json({ message: 'Failed to commit import transaction', error: err.message });
                    res.json({ message: 'Import successful!' });
                });
            });
        });
    });
});
exports.default = router;
