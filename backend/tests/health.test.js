const request = require('supertest');

// Mock auth middleware BEFORE importing server
jest.mock('../middleware/authMiddleware.js', () => (req, res, next) => {
    req.user = { id: 1, username: 'testuser' };
    next();
});

const app = require('../server');

describe('Health Check API', () => {
    it('should return 200 and status "up" for valid URL', async () => {
        // Mock fetch to avoid real network request
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                status: 200,
            })
        );

        const res = await request(app)
            .post('/api/health/check')
            .send({ url: 'https://google.com' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'up');
    });

    it('should return 200 and status "down" for invalid URL', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                status: 500,
            })
        );

        const res = await request(app)
            .post('/api/health/check')
            .send({ url: 'https://broken-site.com' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'down');
    });
});
