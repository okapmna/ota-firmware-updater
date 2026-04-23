const express = require('express');
const router = express.Router();

const uploadRoutes = require('./upload');
const otaRoutes = require('./ota');

router.use('/upload', uploadRoutes);
router.use('/ota', otaRoutes);

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

module.exports = router;
