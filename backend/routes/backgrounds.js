const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const authenticateToken = require('../middleware/authMiddleware.js');

const router = express.Router();

// Setup for Background Image Uploads
const UPLOAD_DIR = path.join('/app/data', 'backgrounds');
// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
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

// List Backgrounds
router.get('/', authenticateToken, (req, res) => {
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

// Upload Background
router.post('/upload', authenticateToken, upload.single('backgroundFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded or invalid file type.' });
    }
    // File has been saved by multer, just return the filename
    res.status(201).json({ filename: req.file.filename });
});

// Delete Background
router.delete('/:filename', authenticateToken, (req, res) => {
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

module.exports = router;
