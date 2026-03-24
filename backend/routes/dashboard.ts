import express, { Response } from 'express';
import { getDb } from '../database';
import authenticateToken from '../middleware/authMiddleware';
import { AuthRequest, Group, Tile } from '../types';

const router = express.Router();

router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const db = getDb();
    const userId = req.user.id;
    const dashboardData: { username: string, groups: Group[], tiles: Tile[], todos: string } = {
        username: req.user.username,
        groups: [],
        tiles: [],
        todos: '[]'
    };

    db.get('SELECT todos FROM users WHERE id = ?', [userId], (err, userRow: { todos: string }) => {
        if (err) return res.status(500).json({ message: 'Error fetching user data', error: err.message });
        if (userRow && userRow.todos) {
            dashboardData.todos = userRow.todos;
        }

        db.all('SELECT * FROM groups WHERE userId = ? ORDER BY position ASC', [userId], (err, groups) => {
            if (err) return res.status(500).json({ message: 'Error fetching groups', error: err.message });
            dashboardData.groups = groups as Group[];

            db.all('SELECT * FROM tiles WHERE userId = ? ORDER BY position ASC', [userId], (err, tiles) => {
                if (err) return res.status(500).json({ message: 'Error fetching tiles', error: err.message });
                dashboardData.tiles = tiles as Tile[];
                res.json(dashboardData);
            });
        });
    });
});

export default router;
