const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { initDb, getDb, dbRun } = require('./database.js'); 
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
const JWT_SECRET = 'your-super-secret-key-change-this'; // Change this!

// --- NEW: Setup for Background Image Uploads ---
const UPLOAD_DIR = path.join('/app/data', 'backgrounds');
// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)){
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Create a unique, safe filename
    const safeFilename = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, safeFilename);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow jpg/png
    if (file.mimetype == "image/png" || file.mimetype == "image/jpeg") {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error('Only .png and .jpg formats are allowed!'));
    }
  }
});
// --- END NEW ---

app.use(express.json());

// --- NEW: Serve static background images ---
app.use('/api/backgrounds', express.static(UPLOAD_DIR));
// --- END NEW ---


// --- Authentication Middleware ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// --- Auth Routes ---
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    // Use the imported dbRun function
    await dbRun('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ message: 'Username already taken' });
    }
    console.error('Signup Error:', err); // Added for debugging
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const db = getDb(); // Use the imported getDb
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
        console.error('Login DB Error:', err);
        return res.status(500).json({ message: 'Error logging in', error: err.message });
    }
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      const tokenUser = { id: user.id, username: user.username };
      const token = jwt.sign(tokenUser, JWT_SECRET, { expiresIn: '1d' });
      res.json({ message: 'Login successful', token, username: user.username });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });
});

app.get('/api/auth/check', authenticateToken, (req, res) => {
  res.json({ message: 'Token is valid', username: req.user.username });
});


// --- Dashboard Endpoint ---
app.get('/api/dashboard', authenticateToken, (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const dashboardData = {
    username: req.user.username,
    groups: [],
    tiles: []
  };

  db.all('SELECT * FROM groups WHERE userId = ? ORDER BY position ASC', [userId], (err, groups) => {
    if (err) return res.status(500).json({ message: 'Error fetching groups', error: err.message });
    dashboardData.groups = groups;

    db.all('SELECT * FROM tiles WHERE userId = ? ORDER BY position ASC', [userId], (err, tiles) => {
      if (err) return res.status(500).json({ message: 'Error fetching tiles', error: err.message });
      dashboardData.tiles = tiles;
      res.json(dashboardData);
    });
  });
});


// --- Tile Routes ---
app.post('/api/tiles', authenticateToken, (req, res) => {
  const { name, url, icon, groupId } = req.body;
  const userId = req.user.id;
  
  if (!name || !url || !icon) {
    return res.status(400).json({ message: 'Name, URL, and Icon are required' });
  }

  const db = getDb();
  const groupFilter = (groupId === null || groupId === undefined) ? 'groupId IS NULL' : 'groupId = ?';
  const groupParams = (groupId === null || groupId === undefined) ? [userId] : [userId, groupId];

  db.get(`SELECT MAX(position) as maxPos FROM tiles WHERE userId = ? AND ${groupFilter}`, groupParams, (err, row) => {
    if (err) return res.status(500).json({ message: 'Error calculating position', error: err.message });

    const newPosition = (row.maxPos === null ? 0 : row.maxPos) + 1;

    db.run('INSERT INTO tiles (userId, name, url, icon, groupId, position) VALUES (?, ?, ?, ?, ?, ?)', 
      [userId, name, url, icon, groupId, newPosition], 
      function (err) {
        if (err) return res.status(500).json({ message: 'Error creating tile', error: err.message });
        res.status(201).json({ id: this.lastID, name, url, icon, groupId, position: newPosition });
      }
    );
  });
});

app.put('/api/tiles/:id(\\d+)', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, url, icon, groupId } = req.body; // <-- Added groupId
  const userId = req.user.id;

  if (!name || !url || !icon) {
    return res.status(400).json({ message: 'Name, URL, and Icon are required' });
  }

  dbRun('UPDATE tiles SET name = ?, url = ?, icon = ?, groupId = ? WHERE id = ? AND userId = ?', [name, url, icon, groupId, id, userId])
    .then((result) => {
      if (result.changes === 0) {
        return res.status(404).json({ message: 'Tile not found or user not authorized' });
      }
      res.json({ message: 'Tile updated successfully', id: Number(id), name, url, icon, groupId });
    })
    .catch(err => res.status(500).json({ message: 'Error updating tile', error: err.message }));
});

app.delete('/api/tiles/:id(\\d+)', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  dbRun('DELETE FROM tiles WHERE id = ? AND userId = ?', [id, userId])
    .then((result) => {
      if (result.changes === 0) {
        return res.status(404).json({ message: 'Tile not found or user not authorized' });
      }
      res.json({ message: 'Tile deleted successfully' });
    })
    .catch(err => res.status(500).json({ message: 'Error deleting tile', error: err.message }));
});

app.put('/api/tiles/order', authenticateToken, (req, res) => {
  const { orderedIds, groupId } = req.body;
  const userId = req.user.id;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ message: 'orderedIds must be an array' });
  }

  const db = getDb();
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    const groupFilter = (groupId === null || groupId === undefined) ? 'groupId IS NULL' : 'groupId = ?';
    const stmt = db.prepare(`UPDATE tiles SET position = ? WHERE id = ? AND userId = ? AND ${groupFilter}`);
    
    const params = (groupId === null || groupId === undefined) ? [userId] : [userId, groupId];
    
    let errorOccurred = false;
    orderedIds.forEach((id, index) => {
      if (groupId === null || groupId === undefined) {
        stmt.run(index, id, userId, (err) => {
          if (err) errorOccurred = true;
        });
      } else {
        stmt.run(index, id, userId, groupId, (err) => {
          if (err) errorOccurred = true;
        });
      }
    });

    stmt.finalize((err) => {
      if (err || errorOccurred) {
        db.run('ROLLBACK');
        return res.status(500).json({ message: 'Failed to update tile order' });
      }
      db.run('COMMIT', (err) => {
        if (err) return res.status(500).json({ message: 'Failed to commit transaction' });
        res.json({ message: 'Tile order updated successfully' });
      });
    });
  });
});

app.put('/api/tiles/move', authenticateToken, (req, res) => {
  const { tileId, newGroupId, newPosition } = req.body;
  const userId = req.user.id;
  const db = getDb();
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    const newGroupFilter = (newGroupId === null || newGroupId === undefined) ? 'groupId IS NULL' : 'groupId = ?';
    const newGroupParams = (newGroupId === null || newGroupId === undefined) ? [userId] : [userId, newGroupId];

    db.run(`UPDATE tiles SET position = position + 1 WHERE userId = ? AND ${newGroupFilter} AND position >= ?`, 
      [...newGroupParams, newPosition], 
      (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ message: 'Error making space in new group', error: err.message });
        }
        db.run('UPDATE tiles SET groupId = ?, position = ? WHERE id = ? AND userId = ?',
          [newGroupId, newPosition, tileId, userId],
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ message: 'Error moving tile', error: err.message });
            }
            db.run('COMMIT', (err) => {
              if (err) return res.status(500).json({ message: 'Failed to commit move' });
              res.json({ message: 'Tile moved successfully' });
            });
          }
        );
      }
    );
  });
});


// --- Group Routes ---
app.post('/api/groups', authenticateToken, (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;
  if (!name) return res.status(400).json({ message: 'Group name is required' });

  const db = getDb();
  db.get('SELECT MAX(position) as maxPos FROM groups WHERE userId = ?', [userId], (err, row) => {
    if (err) return res.status(500).json({ message: 'Error calculating position', error: err.message });
    const newPosition = (row.maxPos === null ? 0 : row.maxPos) + 1;
    db.run('INSERT INTO groups (userId, name, position) VALUES (?, ?, ?)', [userId, name, newPosition], function (err) {
      if (err) return res.status(500).json({ message: 'Error creating group', error: err.message });
      res.status(201).json({ id: this.lastID, name, position: newPosition });
    });
  });
});

app.put('/api/groups/order', authenticateToken, (req, res) => {
  const { orderedIds } = req.body;
  const userId = req.user.id;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ message: 'orderedIds must be an array' });

  const db = getDb();
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const stmt = db.prepare('UPDATE groups SET position = ? WHERE id = ? AND userId = ?');
    let errorOccurred = false;
    orderedIds.forEach((id, index) => {
      stmt.run(index, id, userId, (err) => {
        if (err) errorOccurred = true;
      });
    });
    stmt.finalize((err) => {
      if (err || errorOccurred) {
        db.run('ROLLBACK');
        return res.status(500).json({ message: 'Failed to update group order' });
      }
      db.run('COMMIT', (err) => {
        if (err) return res.status(500).json({ message: 'Failed to commit transaction' });
        res.json({ message: 'Group order updated successfully' });
      });
    });
  });
});

app.put('/api/groups/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user.id;
  if (!name) return res.status(400).json({ message: 'Group name is required' });

  dbRun('UPDATE groups SET name = ? WHERE id = ? AND userId = ?', [name, id, userId])
    .then(result => {
      if (result.changes === 0) return res.status(404).json({ message: 'Group not found' });
      res.json({ message: 'Group updated' });
    })
    .catch(err => res.status(500).json({ message: 'Error updating group', error: err.message }));
});

app.delete('/api/groups/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const db = getDb();
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run('UPDATE tiles SET groupId = NULL WHERE groupId = ? AND userId = ?', [id, userId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ message: 'Error uncategorizing tiles', error: err.message });
      }
      db.run('DELETE FROM groups WHERE id = ? AND userId = ?', [id, userId], function (err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ message: 'Error deleting group', error: err.message });
        }
        if (this.changes === 0) {
          db.run('ROLLBACK');
          return res.status(404).json({ message: 'Group not found' });
        }
        db.run('COMMIT', (err) => {
          if (err) return res.status(500).json({ message: 'Failed to commit delete' });
          res.json({ message: 'Group deleted and tiles uncategorized' });
        });
      });
    });
  });
});

// --- Backup/Restore Routes ---

app.get('/api/backup/export', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const db = getDb();
  let backupData = {
    groups: [],
    tiles: []
  };

  db.all('SELECT * FROM groups WHERE userId = ?', [userId], (err, groups) => {
    if (err) return res.status(500).json({ message: 'Error fetching groups for export', error: err.message });
    backupData.groups = groups;

    db.all('SELECT * FROM tiles WHERE userId = ?', [userId], (err, tiles) => {
      if (err) return res.status(500).json({ message: 'Error fetching tiles for export', error: err.message });
      backupData.tiles = tiles;
      
      // Send the backup data as a JSON response
      res.json(backupData);
    });
  });
});

app.post('/api/backup/import', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { groups, tiles } = req.body;

  // Basic validation
  if (!Array.isArray(groups) || !Array.isArray(tiles)) {
    return res.status(400).json({ message: 'Invalid backup file format.' });
  }

  const db = getDb();
  const oldToNewGroupIdMap = new Map();

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Clear existing user data
    db.run('DELETE FROM tiles WHERE userId = ?', [userId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ message: 'Failed to clear old tiles', error: err.message });
      }
    });
    db.run('DELETE FROM groups WHERE userId = ?', [userId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ message: 'Failed to clear old groups', error: err.message });
      }
    });

    // 2. Insert groups and map old IDs to new IDs
    const groupStmt = db.prepare('INSERT INTO groups (userId, name, position) VALUES (?, ?, ?)');
    groups.forEach(group => {
      groupStmt.run(userId, group.name, group.position, function(err) {
        if (err) {
            console.error('Error inserting group:', err);
            // We can't easily roll back from inside a forEach, so we'll rely on the finalize check
        }
        oldToNewGroupIdMap.set(group.id, this.lastID);
      });
    });
    groupStmt.finalize((err) => {
      if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ message: 'Failed to insert groups', error: err.message });
      }
      
      // 3. Insert tiles, using the new group IDs
      const tileStmt = db.prepare('INSERT INTO tiles (userId, groupId, name, url, icon, position) VALUES (?, ?, ?, ?, ?, ?)');
      tiles.forEach(tile => {
        const newGroupId = tile.groupId ? oldToNewGroupIdMap.get(tile.groupId) : null;
        tileStmt.run(userId, newGroupId, tile.name, tile.url, tile.icon, tile.position);
      });
      
      tileStmt.finalize((err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ message: 'Failed to insert tiles', error: err.message });
        }
        
        // 4. Commit
        db.run('COMMIT', (err) => {
          if (err) return res.status(500).json({ message: 'Failed to commit import transaction', error: err.message });
          res.json({ message: 'Import successful!' });
        });
      });
    });
  });
});


// --- NEW: Background Image Routes ---

app.get('/api/backgrounds', authenticateToken, (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) {
      console.error('Error reading upload dir:', err);
      return res.status(500).json({ message: 'Error reading background images' });
    }
    // Filter for valid image files
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.jpg' || ext === '.jpeg' || ext === '.png';
    });
    res.json(imageFiles);
  });
});

app.post('/api/backgrounds/upload', authenticateToken, upload.single('backgroundFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
  }
  // File has been saved by multer, just return the filename
  res.status(201).json({ filename: req.file.filename });
});

app.delete('/api/backgrounds/:filename', authenticateToken, (req, res) => {
  const { filename } = req.params;

  // --- Security Check ---
  // Ensure filename is just a filename and not a path traversal attempt
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ message: 'Invalid filename' });
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ message: 'File not found' });
      }
      console.error('Error deleting file:', err);
      return res.status(500).json({ message: 'Error deleting file' });
    }
    res.json({ message: 'Background image deleted' });
  });
});
// --- END NEW ROUTES ---


// --- Start Server ---
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
