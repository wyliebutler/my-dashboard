import request from 'supertest';
import app from '../server';
import { initDb } from '../database';

beforeAll(async () => {
    await initDb();
});

describe('Health Endpoints', () => {
    // We need a token to test the check endpoint, but for now let's just test if it returns 401 without token
    it('should return 401 without token', async () => {
        const res = await request(app)
            .post('/api/health/check')
            .send({ url: 'https://google.com' });
        expect(res.statusCode).toEqual(401);
    });
});
