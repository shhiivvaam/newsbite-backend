import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import categoriesRouter from './routes/categories';
import articlesRouter from './routes/articles';
import newsRouter from './routes/news';
import authRouter from './routes/auth';
import notificationsRouter from './routes/notifications';
import { notificationService } from './services/notificationService';

// Load environment variables
dotenv.config();

// Validate required environment variables at startup
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is not set');
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3001;

// === Security Middleware ===
app.use(helmet()); // Sets secure HTTP headers

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000', // Web frontend
  'http://localhost:3001', // Backend itself
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Rate limiting (prevent brute force & DDoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/', limiter, (req: Request, res: Response) => {
  res.send('Hello, I am newsbite backend');
});

app.use('/api/', limiter); // Apply to all API routes

// Auth-specific rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login/signup attempts, try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// Rate limiting for sensitive operations
const sensitiveOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts, please try again later.' },
});
app.use('/api/auth/change-password', sensitiveOperationLimiter);

// === Body Parsing ===
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// === Health Check ===
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// === API Routes ===
app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/news', newsRouter);
app.use('/api/notifications', notificationsRouter);

// === 404 Handler ===
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// === Global Error Handler ===
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
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
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Pass Socket.io instance to NotificationService
notificationService.setSocketServer(io);

const server = httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Export for testing
export default server;