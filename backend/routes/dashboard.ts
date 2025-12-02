import express, { Response } from 'express';
import { getDb } from '../database';
import authenticateToken from '../middleware/authMiddleware';
import { AuthRequest } from '../types';

const router = express.Router();

router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const db = getDb();
    const userId = req.user.id;
    const dashboardData: { username: string, groups: any[], tiles: any[] } = {
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

export default router;
