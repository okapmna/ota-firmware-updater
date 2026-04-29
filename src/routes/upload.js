const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const fs = require('fs');
const crypto = require('crypto');

// Helper to ensure directory exists
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../../firmware_storage/temp');
ensureDir(tempDir);

// Configure storage - Upload to a temp directory first
const upload = multer({ 
    dest: tempDir,
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
    console.log(`Received upload request: device=${device_type}, version=${version}`);
    
    if (!version || !device_type) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ status: 'error', message: 'Version and device_type are required' });
    }

    // Determine final path
    const targetDir = path.join(__dirname, '../../firmware_storage', device_type);
    ensureDir(targetDir);

    const ext = path.extname(req.file.originalname);
    const finalFilename = `${device_type}_${version}_${Date.now()}${ext}`;
    const finalPath = path.join(targetDir, finalFilename);

    try {
        // Move file from temp to final destination
        fs.renameSync(req.file.path, finalPath);
        console.log(`File moved to: ${finalPath}`);

        // Calculate checksum
        const fileBuffer = fs.readFileSync(finalPath);
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
                [version, deviceTypeId, finalFilename, finalPath, checksum]
            );

            res.status(201).json({
                status: 'success',
                message: `Firmware uploaded successfully to folder: ${device_type}`,
                data: {
                    version,
                    device_type,
                    device_type_id: deviceTypeId,
                    filename: finalFilename,
                    checksum,
                    storage_path: finalPath
                }
            });
        } catch (err) {
            console.error('Database error details:', err);
            res.status(500).json({ 
                status: 'error', 
                message: 'Database error occurred',
                details: err.message
            });
        } finally {
            if (conn) conn.release();
        }
    } catch (err) {
        console.error('File operation error:', err);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ status: 'error', message: 'Failed to process file' });
    }
});

module.exports = router;
