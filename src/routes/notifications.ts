import { Router, Request, Response } from 'express';
import { notificationService } from '../services/notificationService';

const router = Router();

router.post('/test', async (req: Request, res: Response) => {
    const { title, body, type } = req.body;

    try {
        await notificationService.broadcastNotification(
            title || 'Test Notification',
            body || 'This is a test notification from the backend.',
            { type: type || 'test', id: 'test-id' }
        );
        res.json({ success: true, message: 'Test notification sent' });
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});

export default router;
