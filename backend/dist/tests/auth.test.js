"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../server"));
const database_1 = require("../database");
beforeAll(async () => {
    await (0, database_1.initDb)();
    // Clean up users table before tests
    await (0, database_1.dbRun)('DELETE FROM users');
});
describe('Auth Endpoints', () => {
    it('should signup a new user', async () => {
        const res = await (0, supertest_1.default)(server_1.default)
            .post('/api/auth/signup')
            .send({
            username: 'testuser',
            password: 'password123'
        });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message', 'User created');
    });
    it('should login the user', async () => {
        const res = await (0, supertest_1.default)(server_1.default)
            .post('/api/auth/login')
            .send({
            username: 'testuser',
            password: 'password123'
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });
    it('should fail login with wrong password', async () => {
        const res = await (0, supertest_1.default)(server_1.default)
            .post('/api/auth/login')
            .send({
            username: 'testuser',
            password: 'wrongpassword'
        });
        expect(res.statusCode).toEqual(401);
    });
});
