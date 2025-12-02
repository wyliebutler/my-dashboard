const request = require('supertest');
const bcrypt = require('bcrypt');

// Mock database BEFORE importing server
const mockDb = {
    get: jest.fn(),
    run: jest.fn(),
};

jest.mock('../database.js', () => ({
    getDb: jest.fn(() => mockDb),
    dbRun: jest.fn(),
    initDb: jest.fn(() => Promise.resolve()), // Mock initDb to do nothing
}));

const app = require('../server');
const { dbRun } = require('../database.js');

describe('Auth API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/signup', () => {
        it('should create a new user', async () => {
            dbRun.mockResolvedValueOnce(); // Mock successful insert

            const res = await request(app)
                .post('/api/auth/signup')
                .send({ username: 'newuser', password: 'password123' });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'User created');
            expect(dbRun).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO users'),
                expect.arrayContaining(['newuser', expect.any(String)])
            );
        });

        it('should return 400 if username or password missing', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ username: 'newuser' }); // Missing password

            expect(res.statusCode).toEqual(400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully with correct credentials', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);

            // Mock db.get to return a user
            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, { id: 1, username: 'testuser', password: hashedPassword });
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'testuser', password: 'password123' });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('message', 'Login successful');
        });

        it('should return 401 with incorrect password', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);

            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, { id: 1, username: 'testuser', password: hashedPassword });
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'testuser', password: 'wrongpassword' });

            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Invalid credentials');
        });

        it('should return 401 if user not found', async () => {
            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, undefined); // User not found
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'nonexistent', password: 'password123' });

            expect(res.statusCode).toEqual(401);
        });
    });
});
