const express = require('express');
const { getDb, dbRun } = require('../database.js');
const authenticateToken = require('../middleware/authMiddleware.js');

const router = express.Router();

// Create Group
router.post('/', authenticateToken, (req, res) => {
    const { name } = req.body;
    const userId = req.user.id;
    if (!name) return res.status(400).json({ message: 'Group name is required' });

    const db = getDb();
    db.get('SELECT MAX(position) as maxPos FROM groups WHERE userId = ?', [userId], (err, row) => {
        if (err) return res.status(500).json({ message: 'Error calculating position', error: err.message });
        const newPosition = (row.maxPos === null ? 0 : row.maxPos) + 1;
        db.run('INSERT INTO groups (userId, name, position) VALUES (?, ?, ?)', [userId, name, newPosition], function (err) {
            if (err) return res.status(500).json({ message: 'Error creating group', error: err.message });
            res.status(201).json({ id: this.lastID, name, position: newPosition });
        });
    });
});

// Reorder Groups
router.put('/order', authenticateToken, (req, res) => {
    const { orderedIds } = req.body;
    const userId = req.user.id;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ message: 'orderedIds must be an array' });

    const db = getDb();
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare('UPDATE groups SET position = ? WHERE id = ? AND userId = ?');
        let errorOccurred = false;
        orderedIds.forEach((id, index) => {
            stmt.run(index, id, userId, (err) => {
                if (err) errorOccurred = true;
            });
        });
        stmt.finalize((err) => {
            if (err || errorOccurred) {
                db.run('ROLLBACK');
                return res.status(500).json({ message: 'Failed to update group order' });
            }
            db.run('COMMIT', (err) => {
                if (err) return res.status(500).json({ message: 'Failed to commit transaction' });
                res.json({ message: 'Group order updated successfully' });
            });
        });
    });
});

// Update Group
router.put('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user.id;
    if (!name) return res.status(400).json({ message: 'Group name is required' });

    dbRun('UPDATE groups SET name = ? WHERE id = ? AND userId = ?', [name, id, userId])
        .then(result => {
            if (result.changes === 0) return res.status(404).json({ message: 'Group not found' });
            res.json({ message: 'Group updated' });
        })
        .catch(err => res.status(500).json({ message: 'Error updating group', error: err.message }));
});

// Delete Group
router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDb();
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('UPDATE tiles SET groupId = NULL WHERE groupId = ? AND userId = ?', [id, userId], (err) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ message: 'Error uncategorizing tiles', error: err.message });
            }
            db.run('DELETE FROM groups WHERE id = ? AND userId = ?', [id, userId], function (err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ message: 'Error deleting group', error: err.message });
                }
                if (this.changes === 0) {
                    db.run('ROLLBACK');
                    return res.status(404).json({ message: 'Group not found' });
                }
                db.run('COMMIT', (err) => {
                    if (err) return res.status(500).json({ message: 'Failed to commit delete' });
                    res.json({ message: 'Group deleted and tiles uncategorized' });
                });
            });
        });
    });
});

module.exports = router;
