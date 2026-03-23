const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Import the new functions from database.js
const { initDb, getDb, dbRun } = require('./database.js'); 

const app = express();
const port = 3000;
const JWT_SECRET = 'your-super-secret-key-change-this'; // Change this!

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
      res.json({ 
          message: 'Login successful', 
          token, 
          username: user.username,
          activeBackgroundColor: user.activeBackgroundColor,
          activeBackgroundId: user.activeBackgroundId 
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });
});

app.get('/api/auth/check', authenticateToken, (req, res) => {
  const db = getDb();
  db.get('SELECT activeBackgroundColor, activeBackgroundId FROM users WHERE id = ?', [req.user.id], (userErr, userRow) => {
      db.all('PRAGMA table_info(tiles)', (err, cols) => {
          res.json({ 
              message: 'Token is valid', 
              username: req.user.username, 
              tableData: cols,
              activeBackgroundColor: userRow ? userRow.activeBackgroundColor : null,
              activeBackgroundId: userRow ? userRow.activeBackgroundId : null
          });
      });
  });
});


app.get('/api/probe', (req, res) => {
  const db = getDb();
  db.all('PRAGMA table_info(tiles)', (err, cols) => res.json(cols));
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
  const { name, url, icon, groupId, borderColor, type, widgetData } = req.body;
  const userId = req.user.id;
  
  if (!name || (!url && type !== 'weather' && type !== 'calendar') || !icon) {
    return res.status(400).json({ message: 'Name, URL (for links), and Icon are required' });
  }

  const db = getDb();
  const groupFilter = (groupId === null || groupId === undefined) ? 'groupId IS NULL' : 'groupId = ?';
  const groupParams = (groupId === null || groupId === undefined) ? [userId] : [userId, groupId];

  db.get(`SELECT MAX(position) as maxPos FROM tiles WHERE userId = ? AND ${groupFilter}`, groupParams, (err, row) => {
    if (err) return res.status(500).json({ message: 'Error calculating position', error: err.message });

    const newPosition = (row.maxPos === null ? 0 : row.maxPos) + 1;

    db.run('INSERT INTO tiles (userId, name, url, icon, groupId, borderColor, type, widgetData, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [userId, name, url || '', icon, groupId, borderColor || null, type || 'link', widgetData || null, newPosition], 
      function (err) {
        if (err) return res.status(500).json({ message: 'Error creating tile', error: err.message });
        res.status(201).json({ id: this.lastID, name, url: url || '', icon, groupId, borderColor, type: type || 'link', widgetData, position: newPosition });
      }
    );
  });
});

app.put('/api/tiles/:id(\\d+)', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, url, icon, groupId, borderColor, type, widgetData } = req.body;
  const userId = req.user.id;

  if (!name || (!url && type !== 'weather' && type !== 'calendar') || !icon) {
    return res.status(400).json({ message: 'Name, URL (for links), and Icon are required' });
  }

  dbRun('UPDATE tiles SET name = ?, url = ?, icon = ?, groupId = ?, borderColor = ?, type = ?, widgetData = ? WHERE id = ? AND userId = ?', 
        [name, url || '', icon, groupId, borderColor || null, type || 'link', widgetData || null, id, userId])
    .then((result) => {
      if (result.changes === 0) {
        return res.status(404).json({ message: 'Tile not found or user not authorized' });
      }
      res.json({ message: 'Tile updated successfully', id: Number(id), name, url: url || '', icon, groupId, borderColor, type: type || 'link', widgetData });
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


// --- User Settings Routes ---
app.put('/api/users/settings', authenticateToken, (req, res) => {
  const { activeBackgroundColor, activeBackgroundId } = req.body;
  const userId = req.user.id;
  
  dbRun('UPDATE users SET activeBackgroundColor = ?, activeBackgroundId = ? WHERE id = ?', 
        [activeBackgroundColor || null, activeBackgroundId || null, userId])
    .then(() => res.json({ message: 'Settings updated' }))
    .catch(err => res.status(500).json({ message: 'Error updating settings', error: err.message }));
});

// --- Background Routes ---
app.get('/api/backgrounds', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const db = getDb();
  db.all('SELECT id, timestamp, dataUrl FROM backgrounds WHERE userId = ? ORDER BY timestamp DESC', [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error fetching backgrounds', error: err.message });
    res.json(rows);
  });
});

app.post('/api/backgrounds', authenticateToken, (req, res) => {
  const { dataUrl, timestamp } = req.body;
  const userId = req.user.id;
  if (!dataUrl) return res.status(400).json({ message: 'Image data is required' });

  dbRun('INSERT INTO backgrounds (userId, dataUrl, timestamp) VALUES (?, ?, ?)', [userId, dataUrl, timestamp || Date.now()])
    .then((result) => {
      res.status(201).json({ id: result.lastID, dataUrl, timestamp });
    })
    .catch(err => res.status(500).json({ message: 'Error saving background', error: err.message }));
});

app.delete('/api/backgrounds/:id(\\d+)', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  dbRun('DELETE FROM backgrounds WHERE id = ? AND userId = ?', [id, userId])
    .then((result) => {
      if (result.changes === 0) return res.status(404).json({ message: 'Background not found' });
      res.json({ message: 'Background deleted' });
    })
    .catch(err => res.status(500).json({ message: 'Error deleting background', error: err.message }));
});


// --- Group Routes ---
app.post('/api/groups', authenticateToken, (req, res) => {
  const { name, borderColor } = req.body;
  const userId = req.user.id;
  if (!name) return res.status(400).json({ message: 'Group name is required' });

  const db = getDb();
  db.get('SELECT MAX(position) as maxPos FROM groups WHERE userId = ?', [userId], (err, row) => {
    if (err) return res.status(500).json({ message: 'Error calculating position', error: err.message });
    const newPosition = (row.maxPos === null ? 0 : row.maxPos) + 1;
    db.run('INSERT INTO groups (userId, name, position, borderColor) VALUES (?, ?, ?, ?)', [userId, name, newPosition, borderColor || null], function (err) {
      if (err) return res.status(500).json({ message: 'Error creating group', error: err.message });
      res.status(201).json({ id: this.lastID, name, position: newPosition, borderColor: borderColor || null });
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
  const { name, borderColor } = req.body;
  const userId = req.user.id;
  if (!name) return res.status(400).json({ message: 'Group name is required' });

  dbRun('UPDATE groups SET name = ?, borderColor = ? WHERE id = ? AND userId = ?', [name, borderColor || null, id, userId])
    .then(result => {
      if (result.changes === 0) return res.status(404).json({ message: 'Group not found' });
      res.json({ message: 'Group updated', id: Number(id), name, borderColor: borderColor || null });
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