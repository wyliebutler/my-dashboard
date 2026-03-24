import express from 'express';
import ical from 'node-ical';
import { getDb, dbRun } from '../database';
import authenticateToken from '../middleware/authMiddleware';

const router = express.Router();

// Middleware to protect these routes
router.use(authenticateToken);

// Save the Calendar URLs
router.post('/urls', async (req: any, res) => {
    try {
        const { workUrl, personalUrl } = req.body;
        
        await dbRun(
            'UPDATE users SET workCalendarUrl = ?, personalCalendarUrl = ? WHERE id = ?',
            [workUrl || null, personalUrl || null, req.user.id]
        );
        
        res.json({ message: 'Calendar links successfully preserved securely.' });
    } catch (error) {
        console.error('Error saving calendar URLs:', error);
        res.status(500).json({ error: 'Failed to securely update configuration' });
    }
});

// Fetch events
router.get('/events', async (req: any, res) => {
    try {
        const db = getDb();
        
        // Retrieve the user's stored iCal URLs
        const userRow: any = await new Promise((resolve, reject) => {
            db.get(
                'SELECT workCalendarUrl, personalCalendarUrl FROM users WHERE id = ?',
                [req.user.id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!userRow) {
            return res.status(404).json({ error: 'User settings not found' });
        }

        const events: any[] = [];
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Gather approx 2 months
        const pastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Helper to process a fetched feed
        const processFeed = async (url: string, type: 'work' | 'personal') => {
            if (!url) return;
            try {
                // Fetch and parse the raw .ics file
                const data = await ical.async.fromURL(url);
                for (const k in data) {
                    if (data.hasOwnProperty(k)) {
                        const ev: any = data[k];
                        if (ev && ev.type === 'VEVENT') {
                            const start = new Date(ev.start);
                            // Only include upcoming / current month events to save memory
                            if (start >= pastMonth && start <= nextMonth) {
                                events.push({
                                    id: ev.uid || k,
                                    title: ev.summary,
                                    date: start,
                                    type: type
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(`Failed to parse ${type} iCal feed:`, err);
            }
        };

        // Fetch both feeds concurrently
        await Promise.all([
            processFeed(userRow.workCalendarUrl, 'work'),
            processFeed(userRow.personalCalendarUrl, 'personal')
        ]);

        // Sort chronologically
        events.sort((a, b) => a.date.getTime() - b.date.getTime());

        res.json(events);
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ error: 'Failed to parse the proprietary calendar payloads' });
    }
});

export default router;
