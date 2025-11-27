"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth"); // ✅ FIXED IMPORT
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-prod';
// ==========================
// ZOD VALIDATION SCHEMAS
// ==========================
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string(),
});
// ==========================
// POST /api/auth/signup
// ==========================
router.post('/signup', async (req, res) => {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({
            error: 'Validation failed',
            details: validation.error.format(),
        });
    }
    const { email, password } = validation.data;
    try {
        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma.users.create({
            data: {
                email,
                password: hashedPassword,
                role: 'USER',
            },
            select: {
                id: true,
                email: true,
                role: true,
                created_at: true,
                updated_at: true,
            },
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(201).json({
            message: 'User registered successfully',
            user,
            token,
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ==========================
// GET /api/auth/users (ADMIN ONLY)
// ==========================
router.get('/users', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }
        const users = await prisma.users.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                created_at: true,
                updated_at: true,
            },
            orderBy: { created_at: 'desc' }
        });
        return res.json({ users });
    }
    catch (error) {
        console.error('Fetch users error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ==========================
// POST /api/auth/login
// ==========================
router.post('/login', async (req, res) => {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({
            error: 'Validation failed',
            details: validation.error.format(),
        });
    }
    const { email, password } = validation.data;
    try {
        const user = await prisma.users.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                created_at: user.created_at,
                updated_at: user.updated_at,
            },
            token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map