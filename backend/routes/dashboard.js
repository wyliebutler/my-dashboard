const express = require('express');
const { getDb } = require('../database.js');
const authenticateToken = require('../middleware/authMiddleware.js');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
    const db = getDb();
    const userId = req.user.id;
    const dashboardData = {
        username: req.user.username,
        groups: [],
        tiles: []
    };

    db.all('SELECT * FROM groups WHERE userId = ? ORDER BY position ASC', [userId], (err, groups) => {
        if (err) return res.status(500).json({ message: 'Error fetching groups', error: err.message });
        dashboardData.groups = groups;

        db.all('SELECT * FROM tiles WHERE userId = ? ORDER BY position ASC', [userId], (err, tiles) => {
            if (err) return res.status(500).json({ message: 'Error fetching tiles', error: err.message });
            dashboardData.tiles = tiles;
            res.json(dashboardData);
        });
    });
});

module.exports = router;
