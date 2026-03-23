import express, { Request, Response } from 'express';
import authenticateToken from '../middleware/authMiddleware';
import { getDb, dbRun } from '../database';

const router = express.Router();

// List Backgrounds
router.get('/', authenticateToken, (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const db = getDb();
    db.all('SELECT id, timestamp, dataUrl FROM backgrounds WHERE userId = ? ORDER BY timestamp DESC', [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Error fetching backgrounds', error: err.message });
        res.json(rows);
    });
});

// Upload Background
router.post('/', authenticateToken, (req: Request, res: Response) => {
    const { dataUrl, timestamp } = req.body;
    const userId = (req as any).user.id;
    if (!dataUrl) return res.status(400).json({ message: 'Image data is required' });

    const db = getDb();
    db.run('INSERT INTO backgrounds (userId, dataUrl, timestamp) VALUES (?, ?, ?)', [userId, dataUrl, timestamp || Date.now()], function(err) {
        if (err) return res.status(500).json({ message: 'Error saving background', error: err.message });
        res.status(201).json({ id: this.lastID, dataUrl, timestamp });
    });
});

// Delete Background
router.delete('/:id(\\d+)', authenticateToken, (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;
    dbRun('DELETE FROM backgrounds WHERE id = ? AND userId = ?', [id, userId])
        .then(() => {
            res.json({ message: 'Background deleted' });
        })
        .catch(err => res.status(500).json({ message: 'Error deleting background', error: err.message }));
});

export default router;
