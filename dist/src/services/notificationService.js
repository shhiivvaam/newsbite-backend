"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const admin = __importStar(require("firebase-admin"));
class NotificationService {
    constructor() {
        this.io = null;
        this.firebaseInitialized = false;
        this.initializeFirebase();
    }
    initializeFirebase() {
        try {
            if (!admin.apps.length) {
                // Check if FIREBASE_SERVICE_ACCOUNT env var exists and is a valid JSON string
                const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
                if (serviceAccountEnv) {
                    let serviceAccount;
                    try {
                        serviceAccount = JSON.parse(serviceAccountEnv);
                    }
                    catch (e) {
                        console.warn('FIREBASE_SERVICE_ACCOUNT is not a valid JSON string. Assuming it is a path or handling otherwise if needed.');
                        // If it's a path, you might require it, but for now let's assume JSON content or standard Google auth
                    }
                    if (serviceAccount) {
                        admin.initializeApp({
                            credential: admin.credential.cert(serviceAccount),
                        });
                        this.firebaseInitialized = true;
                        console.log('Firebase Admin initialized successfully.');
                    }
                    else {
                        // Fallback to default credentials (useful for GCP environments)
                        admin.initializeApp();
                        this.firebaseInitialized = true;
                        console.log('Firebase Admin initialized with default credentials.');
                    }
                }
                else {
                    console.warn('FIREBASE_SERVICE_ACCOUNT environment variable not found. Push notifications will be disabled.');
                }
            }
            else {
                this.firebaseInitialized = true;
            }
        }
        catch (error) {
            console.error('Failed to initialize Firebase Admin:', error);
        }
    }
    setSocketServer(io) {
        this.io = io;
        this.io.on('connection', (socket) => {
            console.log('Client connected to notification service:', socket.id);
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }
    async broadcastNotification(title, body, data = {}) {
        console.log(`Broadcasting notification: ${title} - ${body}`);
        // 1. Emit to all connected Socket.io clients (Web & App live updates)
        if (this.io) {
            this.io.emit('notification', {
                title,
                body,
                data,
                timestamp: new Date().toISOString(),
            });
        }
        else {
            console.warn('Socket.io not initialized, skipping live update.');
        }
        // 2. Send Push Notification via FCM (Mobile App background/foreground)
        if (this.firebaseInitialized) {
            try {
                const message = {
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
            }
            catch (error) {
                console.error('Error sending FCM message:', error);
            }
        }
        else {
            console.warn('Firebase not initialized, skipping push notification.');
        }
    }
}
exports.notificationService = new NotificationService();
//# sourceMappingURL=notificationService.js.map