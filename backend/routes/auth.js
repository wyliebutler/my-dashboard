const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb, dbRun } = require('../database.js');
const authenticateToken = require('../middleware/authMiddleware.js');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await dbRun('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: 'User created' });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'Username already taken' });
        }
        console.error('Signup Error:', err);
        res.status(500).json({ message: 'Error creating user', error: err.message });
    }
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const db = getDb();
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Login DB Error:', err);
            return res.status(500).json({ message: 'Error logging in', error: err.message });
        }
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            const tokenUser = { id: user.id, username: user.username };
            const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '1d' });
            res.json({ message: 'Login successful', token, username: user.username });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    });
});

// Check Token
router.get('/check', authenticateToken, (req, res) => {
    res.json({ message: 'Token is valid', username: req.user.username });
});

module.exports = router;
