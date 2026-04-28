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
        const deviceType = req.body.device_type || 'unknown';
        const dir = path.join(__dirname, '../../firmware_storage', deviceType);
        
        // Create directory automatically based on device type
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const version = req.body.version || 'v1.0.0';
        const deviceType = req.body.device_type || 'esp32';
        const ext = path.extname(file.originalname);
        // Clean filename: deviceType_version_timestamp.bin
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

// POST endpoint for Firmware Upload
router.post('/', auth, upload.single('firmware'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const { version, device_type } = req.body;
    
    if (!version || !device_type) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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
        
        // 1. Get or Create device_type_id
        let rows = await conn.query("SELECT id FROM device_types WHERE type_name = ?", [device_type]);
        let deviceTypeId;

        if (rows.length === 0) {
            const result = await conn.query("INSERT INTO device_types (type_name) VALUES (?)", [device_type]);
            deviceTypeId = result.insertId;
        } else {
            deviceTypeId = rows[0].id;
        }

        // 2. Insert into firmwares table using device_type_id
        await conn.query(
            "INSERT INTO firmwares (version, device_type_id, filename, file_path, checksum) VALUES (?, ?, ?, ?, ?)",
            [version, deviceTypeId, req.file.filename, req.file.path, checksum]
        );

        res.status(201).json({
            status: 'success',
            message: `Firmware uploaded successfully to folder: ${device_type}`,
            data: {
                version,
                device_type,
                device_type_id: deviceTypeId,
                filename: req.file.filename,
                checksum,
                storage_path: req.file.path
            }
        });
    } catch (err) {
        console.error('Database error:', err);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
