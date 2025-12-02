"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';
// Signup
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        await (0, database_1.dbRun)('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: 'User created' });
    }
    catch (err) {
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
    const db = (0, database_1.getDb)();
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Login DB Error:', err);
            return res.status(500).json({ message: 'Error logging in', error: err.message });
        }
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const match = await bcrypt_1.default.compare(password, user.password);
        if (match) {
            const tokenUser = { id: user.id, username: user.username };
            const token = jsonwebtoken_1.default.sign(tokenUser, JWT_SECRET, { expiresIn: '1d' });
            res.json({ message: 'Login successful', token, username: user.username });
        }
        else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    });
});
// Check Token
// Check Token
router.get('/check', authMiddleware_1.default, (req, res) => {
    if (!req.user)
        return res.sendStatus(401);
    const db = (0, database_1.getDb)();
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
exports.default = router;
