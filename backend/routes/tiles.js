const express = require('express');
const { getDb, dbRun } = require('../database.js');
const authenticateToken = require('../middleware/authMiddleware.js');

const router = express.Router();

// Create Tile
router.post('/', authenticateToken, (req, res) => {
    const { name, url, icon, groupId } = req.body;
    const userId = req.user.id;

    if (!name || !url || !icon) {
        return res.status(400).json({ message: 'Name, URL, and Icon are required' });
    }

    const db = getDb();
    const groupFilter = (groupId === null || groupId === undefined) ? 'groupId IS NULL' : 'groupId = ?';
    const groupParams = (groupId === null || groupId === undefined) ? [userId] : [userId, groupId];

    db.get(`SELECT MAX(position) as maxPos FROM tiles WHERE userId = ? AND ${groupFilter}`, groupParams, (err, row) => {
        if (err) return res.status(500).json({ message: 'Error calculating position', error: err.message });

        const newPosition = (row.maxPos === null ? 0 : row.maxPos) + 1;

        db.run('INSERT INTO tiles (userId, name, url, icon, groupId, position) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, name, url, icon, groupId, newPosition],
            function (err) {
                if (err) return res.status(500).json({ message: 'Error creating tile', error: err.message });
                res.status(201).json({ id: this.lastID, name, url, icon, groupId, position: newPosition });
            }
        );
    });
});

// Update Tile
router.put('/:id(\\d+)', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, url, icon, groupId } = req.body;
    const userId = req.user.id;

    if (!name || !url || !icon) {
        return res.status(400).json({ message: 'Name, URL, and Icon are required' });
    }

    dbRun('UPDATE tiles SET name = ?, url = ?, icon = ?, groupId = ? WHERE id = ? AND userId = ?', [name, url, icon, groupId, id, userId])
        .then((result) => {
            if (result.changes === 0) {
                return res.status(404).json({ message: 'Tile not found or user not authorized' });
            }
            res.json({ message: 'Tile updated successfully', id: Number(id), name, url, icon, groupId });
        })
        .catch(err => res.status(500).json({ message: 'Error updating tile', error: err.message }));
});

// Delete Tile
router.delete('/:id(\\d+)', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    dbRun('DELETE FROM tiles WHERE id = ? AND userId = ?', [id, userId])
        .then((result) => {
            if (result.changes === 0) {
                return res.status(404).json({ message: 'Tile not found or user not authorized' });
            }
            res.json({ message: 'Tile deleted successfully' });
        })
        .catch(err => res.status(500).json({ message: 'Error deleting tile', error: err.message }));
});

// Reorder Tiles
router.put('/order', authenticateToken, (req, res) => {
    const { orderedIds, groupId } = req.body;
    const userId = req.user.id;
    if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ message: 'orderedIds must be an array' });
    }

    const db = getDb();
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const groupFilter = (groupId === null || groupId === undefined) ? 'groupId IS NULL' : 'groupId = ?';
        const stmt = db.prepare(`UPDATE tiles SET position = ? WHERE id = ? AND userId = ? AND ${groupFilter}`);

        const params = (groupId === null || groupId === undefined) ? [userId] : [userId, groupId];

        let errorOccurred = false;
        orderedIds.forEach((id, index) => {
            if (groupId === null || groupId === undefined) {
                stmt.run(index, id, userId, (err) => {
                    if (err) errorOccurred = true;
                });
            } else {
                stmt.run(index, id, userId, groupId, (err) => {
                    if (err) errorOccurred = true;
                });
            }
        });

        stmt.finalize((err) => {
            if (err || errorOccurred) {
                db.run('ROLLBACK');
                return res.status(500).json({ message: 'Failed to update tile order' });
            }
            db.run('COMMIT', (err) => {
                if (err) return res.status(500).json({ message: 'Failed to commit transaction' });
                res.json({ message: 'Tile order updated successfully' });
            });
        });
    });
});

// Move Tile
router.put('/move', authenticateToken, (req, res) => {
    const { tileId, newGroupId, newPosition } = req.body;
    const userId = req.user.id;
    const db = getDb();
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const newGroupFilter = (newGroupId === null || newGroupId === undefined) ? 'groupId IS NULL' : 'groupId = ?';
        const newGroupParams = (newGroupId === null || newGroupId === undefined) ? [userId] : [userId, newGroupId];

        db.run(`UPDATE tiles SET position = position + 1 WHERE userId = ? AND ${newGroupFilter} AND position >= ?`,
            [...newGroupParams, newPosition],
            (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ message: 'Error making space in new group', error: err.message });
                }
                db.run('UPDATE tiles SET groupId = ?, position = ? WHERE id = ? AND userId = ?',
                    [newGroupId, newPosition, tileId, userId],
                    (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ message: 'Error moving tile', error: err.message });
                        }
                        db.run('COMMIT', (err) => {
                            if (err) return res.status(500).json({ message: 'Failed to commit move' });
                            res.json({ message: 'Tile moved successfully' });
                        });
                    }
                );
            }
        );
    });
});

module.exports = router;
