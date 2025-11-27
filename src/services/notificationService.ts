import { Server as SocketIOServer } from 'socket.io';
import * as admin from 'firebase-admin';

class NotificationService {
    private io: SocketIOServer | null = null;
    private firebaseInitialized = false;

    constructor() {
        this.initializeFirebase();
    }

    private initializeFirebase() {
        try {
            if (!admin.apps.length) {
                // Check if FIREBASE_SERVICE_ACCOUNT env var exists and is a valid JSON string
                const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

                if (serviceAccountEnv) {
                    let serviceAccount;
                    try {
                        serviceAccount = JSON.parse(serviceAccountEnv);
                    } catch (e) {
                        console.warn('FIREBASE_SERVICE_ACCOUNT is not a valid JSON string. Assuming it is a path or handling otherwise if needed.');
                        // If it's a path, you might require it, but for now let's assume JSON content or standard Google auth
                    }

                    if (serviceAccount) {
                        admin.initializeApp({
                            credential: admin.credential.cert(serviceAccount),
                        });
                        this.firebaseInitialized = true;
                        console.log('Firebase Admin initialized successfully.');
                    } else {
                        // Fallback to default credentials (useful for GCP environments)
                        admin.initializeApp();
                        this.firebaseInitialized = true;
                        console.log('Firebase Admin initialized with default credentials.');
                    }
                } else {
                    console.warn('FIREBASE_SERVICE_ACCOUNT environment variable not found. Push notifications will be disabled.');
                }
            } else {
                this.firebaseInitialized = true;
            }
        } catch (error) {
            console.error('Failed to initialize Firebase Admin:', error);
        }
    }

    public setSocketServer(io: SocketIOServer) {
        this.io = io;
        this.io.on('connection', (socket) => {
            console.log('Client connected to notification service:', socket.id);

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }

    public async broadcastNotification(title: string, body: string, data: any = {}) {
        console.log(`Broadcasting notification: ${title} - ${body}`);

        // 1. Emit to all connected Socket.io clients (Web & App live updates)
        if (this.io) {
            this.io.emit('notification', {
                title,
                body,
                data,
                timestamp: new Date().toISOString(),
            });
        } else {
            console.warn('Socket.io not initialized, skipping live update.');
        }

        // 2. Send Push Notification via FCM (Mobile App background/foreground)
        if (this.firebaseInitialized) {
            try {
                const message: admin.messaging.Message = {
                    topic: 'newsbite-updates', // App should subscribe to this topic
                    notification: {
                        title,
                        body,
                    },
                    data: {
                        ...data,
                        click_action: 'FLUTTER_NOTIFICATION_CLICK', // or appropriate action for Expo/React Native
                    },
                };

                const response = await admin.messaging().send(message);
                console.log('Successfully sent FCM message:', response);
            } catch (error) {
                console.error('Error sending FCM message:', error);
            }
        } else {
            console.warn('Firebase not initialized, skipping push notification.');
        }
    }
}

export const notificationService = new NotificationService();
