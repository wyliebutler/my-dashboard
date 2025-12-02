const express = require('express');
const path = require('path');
const { initDb } = require('./database.js');

const authRouter = require('./routes/auth.js');
const dashboardRouter = require('./routes/dashboard.js');
const tilesRouter = require('./routes/tiles.js');
const groupsRouter = require('./routes/groups.js');
const backupRouter = require('./routes/backup.js');
const backgroundsRouter = require('./routes/backgrounds.js');
const healthRouter = require('./routes/health.js');

const app = express();
const port = 3000;

// Backgrounds path (duplicated from routes/backgrounds.js to serve static files)
const UPLOAD_DIR = path.join('/app/data', 'backgrounds');

app.use(express.json());

// Serve static background images
app.use('/api/backgrounds', express.static(UPLOAD_DIR));

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/tiles', tilesRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/backup', backupRouter);
app.use('/api/backgrounds', backgroundsRouter);
app.use('/api/health', healthRouter);

// Start Server
async function startServer() {
  try {
    // Wait for the database to be initialized
    await initDb();
    console.log('Database initialized successfully.');

    // Start the server
    app.listen(port, () => {
      console.log(`Backend server running on http://localhost:${port}`);
    });

  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    process.exit(1); // Exit if DB fails
  }
}

// Call the async start function
startServer();
