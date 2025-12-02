"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = express_1.default.Router();
// Check URL Health
router.post('/check', authMiddleware_1.default, async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ status: 'error', message: 'URL is required' });
    }
    try {
        // We use a short timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        // Use a standard browser User-Agent to avoid being blocked
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        let response;
        try {
            response = await fetch(url, {
                method: 'HEAD', // Try lightweight check first
                signal: controller.signal,
                headers
            });
        }
        catch (headErr) {
            // If HEAD fails (e.g. network error), we might want to try GET, 
            // but usually network errors mean it's down. 
            // However, if it's a method not allowed (which fetch doesn't throw on, but returns status), we handle below.
            throw headErr;
        }
        // If HEAD is not allowed (405) or Forbidden (403), try GET
        if (response.status === 405 || response.status === 403) {
            // Re-create controller for the new request
            clearTimeout(timeoutId);
            const controller2 = new AbortController();
            const timeoutId2 = setTimeout(() => controller2.abort(), 5000);
            try {
                response = await fetch(url, {
                    method: 'GET',
                    signal: controller2.signal,
                    headers
                });
                clearTimeout(timeoutId2);
            }
            catch (getErr) {
                clearTimeout(timeoutId2);
                throw getErr;
            }
        }
        else {
            clearTimeout(timeoutId);
        }
        // We consider 2xx, 3xx, and even 403 (Forbidden) as "UP" because the server responded.
        // 404 means the specific page is gone, but the server is up. 
        // For a dashboard, usually we just want to know if the server is reachable.
        // Let's be generous: if we got a status code, the server is there.
        // But 5xx means server error.
        if (response.status < 500) {
            res.json({ status: 'up', code: response.status });
        }
        else {
            res.json({ status: 'down', code: response.status });
        }
    }
    catch (err) {
        // Only network errors or timeouts end up here
        res.json({ status: 'down', error: err.message });
    }
});
exports.default = router;
