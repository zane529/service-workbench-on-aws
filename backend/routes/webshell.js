const express = require('express');
const AWS = require('aws-sdk');
const router = express.Router();

// POST /api/environments/:id/start-ssm-session
router.post('/api/environments/:id/start-ssm-session', async (req, res) => {
    const { id } = req.params; // id 是 EC2 instanceId
    const region = process.env.APP_AWS_REGION || 'ap-southeast-1';
    const ssm = new AWS.SSM({ region });
    try {
        const result = await ssm.startSession({
            Target: id,
            DocumentName: 'AWS-StartInteractiveCommand', // 或 AWS-StartSSHSession
        }).promise();
        res.json(result); // 包含 SessionId, StreamUrl, TokenValue
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router; 