import express from 'express';
import Parser from 'rss-parser';

const router = express.Router();
const parser = new Parser({
    customFields: {
        item: ['media:content', 'media:thumbnail']
    }
});

const FEED_URLS = [
    { name: 'CNN', url: 'http://rss.cnn.com/rss/cnn_topstories.rss' },
    { name: 'CBC', url: 'https://www.cbc.ca/cmlink/rss-topstories' },
    { name: 'VOCM', url: 'https://vocm.com/feed/' },
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' }
];

// In-memory cache
let rssCache: { timestamp: number; data: any[] } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

router.get('/', async (req, res) => {
    try {
        const now = Date.now();
        if (rssCache && (now - rssCache.timestamp) < CACHE_TTL_MS) {
            return res.json(rssCache.data);
        }

        const FEED_URLS = [
            { url: 'https://vocm.com/feed/', source: 'VOCM' },
            { url: 'http://rss.cnn.com/rss/cnn_topstories.rss', source: 'CNN' },
            { url: 'https://www.cbc.ca/cmlink/rss-topstories', source: 'CBC' },
            { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' }
        ];

        // Fetch all feeds concurrently
        const feedPromises = FEED_URLS.map(async (feedInfo) => {
            try {
                const feed = await parser.parseURL(feedInfo.url);
                return feed.items.map(item => ({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    source: feedInfo.source
                }));
            } catch (err) {
                console.error(`Failed to fetch ${feedInfo.source}:`, err);
                return [];
            }
        });

        const results = await Promise.all(feedPromises);
        
        // Flatten the array of arrays
        let allItems = results.flat();
        
        // Group items by source
        const groupedBySource: Record<string, any[]> = {};
        for (const item of allItems) {
            if (!groupedBySource[item.source]) groupedBySource[item.source] = [];
            groupedBySource[item.source].push(item);
        }

        // Sort internally by date (newest first)
        for (const source in groupedBySource) {
            groupedBySource[source].sort((a, b) => {
                const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
                const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
                return dateB - dateA;
            });
        }

        // Interleave feeds (Round-Robin) in user-requested order
        const sourceOrder = ['VOCM', 'CNN', 'CBC', 'TechCrunch'];
        const mixedItems: any[] = [];
        
        // Take up to 5 articles from each source
        for (let i = 0; i < 5; i++) {
            for (const source of sourceOrder) {
                if (groupedBySource[source] && groupedBySource[source][i]) {
                    mixedItems.push(groupedBySource[source][i]);
                }
            }
        }

        // Cache the round-robin payload
        rssCache = {
            timestamp: now,
            data: mixedItems
        };

        res.json(mixedItems);
    } catch (error) {
        console.error('RSS Endpoint Error:', error);
        res.status(500).json({ error: 'Failed to aggregate RSS feeds' });
    }
});

export default router;
