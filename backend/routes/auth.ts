import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb, dbRun } from '../database';
import authenticateToken from '../middleware/authMiddleware';
import { AuthRequest, User } from '../types';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';

// Signup
router.post('/signup', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await dbRun('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: 'User created' });
    } catch (err: unknown) {
        if ((err as any).code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'Username already taken' });
        }
        console.error('Signup Error:', err);
        res.status(500).json({ message: 'Error creating user', error: (err as Error).message });
    }
});

// Login
router.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const db = getDb();
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err: Error | null, user: User) => {
        if (err) {
            console.error('Login DB Error:', err);
            return res.status(500).json({ message: 'Error logging in', error: err.message });
        }
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.password) {
            return res.status(500).json({ message: 'User data corrupted' });
        }
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            const tokenUser: User = { id: user.id, username: user.username };
            const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '1d' });
            res.json({ message: 'Login successful', token, username: user.username });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    });
});

// Check Token
// Check Token
router.get('/check', authenticateToken, (req: AuthRequest, res: Response) => {
    if (!req.user) return res.sendStatus(401);

    const db = getDb();
    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
            console.error('Check Token DB Error:', err);
            return res.sendStatus(500);
        }
        if (!user) {
            return res.sendStatus(401); // User no longer exists
        }
        res.json({ message: 'Token is valid', username: req.user?.username });
    });
});

export default router;
