"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationService_1 = require("../services/notificationService");
const router = (0, express_1.Router)();
router.post('/test', async (req, res) => {
    const { title, body, type } = req.body;
    try {
        await notificationService_1.notificationService.broadcastNotification(title || 'Test Notification', body || 'This is a test notification from the backend.', { type: type || 'test', id: 'test-id' });
        res.json({ success: true, message: 'Test notification sent' });
    }
    catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map