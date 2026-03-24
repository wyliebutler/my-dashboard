import express from 'express';
import path from 'path';
import { initDb, dbRun } from './database';
import authenticateToken from './middleware/authMiddleware';

import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import tilesRouter from './routes/tiles';
import groupsRouter from './routes/groups';
import backupRouter from './routes/backup';
import backgroundsRouter from './routes/backgrounds';
import healthRouter from './routes/health';
import systemRouter from './routes/system';
import tickerRouter from './routes/ticker';
import rssRoutes from './routes/rss';
import calendarRoutes from './routes/calendar';

const app = express();
const port = 3000;

// Backgrounds path (duplicated from routes/backgrounds.js to serve static files)
const UPLOAD_DIR = path.join('/app/data', 'backgrounds');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
app.use('/api/system', systemRouter);
app.use('/api/ticker', tickerRouter);
app.use('/api/rss', rssRoutes);
app.use('/api/calendar', calendarRoutes);

app.put('/api/users/settings', authenticateToken, (req: express.Request, res: express.Response) => {
  const { activeBackgroundColor, activeBackgroundId } = req.body;
  const userId = (req as any).user.id;
  
  dbRun('UPDATE users SET activeBackgroundColor = ?, activeBackgroundId = ? WHERE id = ?', 
        [activeBackgroundColor || null, activeBackgroundId || null, userId])
    .then(() => res.json({ message: 'Settings updated' }))
    .catch((err: any) => res.status(500).json({ message: 'Error updating settings', error: err.message }));
});

app.put('/api/todos', authenticateToken, (req: express.Request, res: express.Response) => {
  const { todos } = req.body;
  const userId = (req as any).user.id;
  
  const todosString = typeof todos === 'string' ? todos : JSON.stringify(todos);

  dbRun('UPDATE users SET todos = ? WHERE id = ?', [todosString, userId])
    .then(() => res.json({ message: 'Todos updated' }))
    .catch((err: any) => res.status(500).json({ message: 'Error updating todos', error: err.message }));
});

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

  } catch (err: unknown) {
    console.error('Failed to initialize database:', (err as Error).message);
    process.exit(1); // Exit if DB fails
  }
}

// Call the async start function ONLY if run directly
if (require.main === module) {
  startServer();
}

export default app;

