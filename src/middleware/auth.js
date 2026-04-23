require('dotenv').config();

const authMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.headers['x-github-token'];
    
    if (!apiKey || apiKey !== process.env.GITHUB_WEBHOOK_SECRET) {
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Invalid or missing API Key'
        });
    }
    
    next();
};

module.exports = authMiddleware;
