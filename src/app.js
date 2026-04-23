const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for firmware (optional, handled by route download)
// app.use('/firmwares', express.static(path.join(__dirname, '../firmware_storage')));

// Routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
    res.json({
        name: 'OTA Firmware Updater API',
        version: '1.0.0',
        status: 'running'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Upload endpoint: http://localhost:${PORT}/api/upload`);
    console.log(`OTA Check endpoint: http://localhost:${PORT}/api/ota/check`);
});
