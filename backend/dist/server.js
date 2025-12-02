"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
const auth_1 = __importDefault(require("./routes/auth"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const tiles_1 = __importDefault(require("./routes/tiles"));
const groups_1 = __importDefault(require("./routes/groups"));
const backup_1 = __importDefault(require("./routes/backup"));
const backgrounds_1 = __importDefault(require("./routes/backgrounds"));
const health_1 = __importDefault(require("./routes/health"));
const app = (0, express_1.default)();
const port = 3000;
// Backgrounds path (duplicated from routes/backgrounds.js to serve static files)
const UPLOAD_DIR = path_1.default.join('/app/data', 'backgrounds');
app.use(express_1.default.json());
// Serve static background images
app.use('/api/backgrounds', express_1.default.static(UPLOAD_DIR));
// Mount Routes
app.use('/api/auth', auth_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/tiles', tiles_1.default);
app.use('/api/groups', groups_1.default);
app.use('/api/backup', backup_1.default);
app.use('/api/backgrounds', backgrounds_1.default);
app.use('/api/health', health_1.default);
// Start Server
async function startServer() {
    try {
        // Wait for the database to be initialized
        await (0, database_1.initDb)();
        console.log('Database initialized successfully.');
        // Start the server
        app.listen(port, () => {
            console.log(`Backend server running on http://localhost:${port}`);
        });
    }
    catch (err) {
        console.error('Failed to initialize database:', err.message);
        process.exit(1); // Exit if DB fails
    }
}
// Call the async start function ONLY if run directly
if (require.main === module) {
    startServer();
}
exports.default = app;
