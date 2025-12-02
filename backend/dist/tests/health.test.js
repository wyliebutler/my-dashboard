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
});
describe('Health Endpoints', () => {
    // We need a token to test the check endpoint, but for now let's just test if it returns 401 without token
    it('should return 401 without token', async () => {
        const res = await (0, supertest_1.default)(server_1.default)
            .post('/api/health/check')
            .send({ url: 'https://google.com' });
        expect(res.statusCode).toEqual(401);
    });
});
