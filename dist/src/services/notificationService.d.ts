import { Server as SocketIOServer } from 'socket.io';
declare class NotificationService {
    private io;
    private firebaseInitialized;
    constructor();
    private initializeFirebase;
    setSocketServer(io: SocketIOServer): void;
    broadcastNotification(title: string, body: string, data?: any): Promise<void>;
}
export declare const notificationService: NotificationService;
export {};
//# sourceMappingURL=notificationService.d.ts.map