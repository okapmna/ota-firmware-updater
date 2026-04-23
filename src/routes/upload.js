const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const fs = require('fs');
const crypto = require('crypto');

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../firmware_storage');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const version = req.body.version || 'v1.0.0';
        const deviceType = req.body.device_type || 'esp32';
        const ext = path.extname(file.originalname);
        cb(null, `${deviceType}_${version}_${Date.now()}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname) !== '.bin') {
            return cb(new Error('Only .bin files are allowed'));
        }
        cb(null, true);
    }
});

// POST endpoint for GitHub Actions
router.post('/', auth, upload.single('firmware'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const { version, device_type } = req.body;
    
    if (!version || !device_type) {
        // Clean up uploaded file if data is missing
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ status: 'error', message: 'Version and device_type are required' });
    }

    // Calculate checksum
    const fileBuffer = fs.readFileSync(req.file.path);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    const checksum = hashSum.digest('hex');

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            "INSERT INTO firmwares (version, device_type, filename, file_path, checksum) VALUES (?, ?, ?, ?, ?)",
            [version, device_type, req.file.filename, req.file.path, checksum]
        );

        res.status(201).json({
            status: 'success',
            message: 'Firmware uploaded successfully',
            data: {
                version,
                device_type,
                filename: req.file.filename,
                checksum
            }
        });
    } catch (err) {
        console.error('Database error:', err);
        // Clean up file on error
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
