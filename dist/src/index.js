"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const categories_1 = __importDefault(require("./routes/categories"));
const articles_1 = __importDefault(require("./routes/articles"));
const news_1 = __importDefault(require("./routes/news"));
const auth_1 = __importDefault(require("./routes/auth"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const notificationService_1 = require("./services/notificationService");
// Load environment variables
dotenv_1.default.config();
// Validate required environment variables at startup
if (!process.env.JWT_SECRET) {
    console.error('ERROR: JWT_SECRET environment variable is not set');
    process.exit(1);
}
const app = (0, express_1.default)();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3001;
// === Security Middleware ===
app.use((0, helmet_1.default)()); // Sets secure HTTP headers
// CORS Configuration
const allowedOrigins = [
    'http://localhost:3000', // Web frontend
    'http://localhost:3001', // Backend itself
    process.env.CLIENT_URL,
].filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use((0, cors_1.default)(corsOptions));
// Rate limiting (prevent brute force & DDoS)
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.get('/', limiter, (req, res) => {
    res.send('Hello, I am newsbite backend');
});
app.use('/api/', limiter); // Apply to all API routes
// Auth-specific rate limiting (stricter)
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login/signup attempts, try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
// Rate limiting for sensitive operations
const sensitiveOperationLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many attempts, please try again later.' },
});
app.use('/api/auth/change-password', sensitiveOperationLimiter);
// === Body Parsing ===
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// === Health Check ===
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// === API Routes ===
app.use('/api/auth', auth_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/articles', articles_1.default);
app.use('/api/news', news_1.default);
app.use('/api/notifications', notifications_1.default);
// === 404 Handler ===
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
    });
});
// === Global Error Handler ===
app.use((error, req, res, next) => {
    console.error('Unhandled Error:', error);
    // Prisma-specific errors
    if (error.code && error.code.startsWith('P')) {
        return res.status(400).json({
            error: 'Database error',
            code: error.code,
        });
    }
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
    }
    res.status(error.status || 500).json({
        error: 'Internal server error',
        // Only show stack in development
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
});
// === Graceful Shutdown ===
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});
// === Start Server ===
const httpServer = (0, http_1.createServer)(app);
// Initialize Socket.io
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
// Pass Socket.io instance to NotificationService
notificationService_1.notificationService.setSocketServer(io);
const server = httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
// Export for testing
exports.default = server;
//# sourceMappingURL=index.js.map