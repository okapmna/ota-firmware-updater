const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET / - Display the firmware releases page
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Fetch all firmwares with their device type names
        const firmwares = await conn.query(`
            SELECT f.*, dt.type_name 
            FROM firmwares f 
            JOIN device_types dt ON f.device_type_id = dt.id 
            ORDER BY dt.type_name ASC, f.created_at DESC
        `);

        // Group firmwares by device type for structured display
        const grouped = firmwares.reduce((acc, f) => {
            if (!acc[f.type_name]) {
                acc[f.type_name] = [];
            }
            acc[f.type_name].push(f);
            return acc;
        }, {});

        res.render('index', { grouped });
    } catch (err) {
        console.error('Error fetching releases:', err);
        res.status(500).send('An error occurred while loading the releases page.');
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
