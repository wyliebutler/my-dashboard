"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = express_1.default.Router();
router.get('/', authMiddleware_1.default, (req, res) => {
    if (!req.user)
        return res.sendStatus(401);
    const db = (0, database_1.getDb)();
    const userId = req.user.id;
    const dashboardData = {
        username: req.user.username,
        groups: [],
        tiles: []
    };
    db.all('SELECT * FROM groups WHERE userId = ? ORDER BY position ASC', [userId], (err, groups) => {
        if (err)
            return res.status(500).json({ message: 'Error fetching groups', error: err.message });
        dashboardData.groups = groups;
        db.all('SELECT * FROM tiles WHERE userId = ? ORDER BY position ASC', [userId], (err, tiles) => {
            if (err)
                return res.status(500).json({ message: 'Error fetching tiles', error: err.message });
            dashboardData.tiles = tiles;
            res.json(dashboardData);
        });
    });
});
exports.default = router;
