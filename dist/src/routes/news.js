"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const notificationService_1 = require("../services/notificationService");
const router = (0, express_1.Router)();
// Pagination helper
function buildPagination(req) {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10')));
    const sort = req.query.sort || 'created_at';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';
    const skip = (page - 1) * limit;
    return { page, limit, skip, sort, order };
}
// UUID validation helper with proper type guarding
function isValidUuid(id) {
    return typeof id === 'string' && (0, uuid_1.validate)(id);
}
/* =============================================
   PUBLIC READ ROUTES
============================================= */
// GET all news (admin sees all, public sees only published)
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        const { page, limit, skip, sort, order } = buildPagination(req);
        const isAdmin = req.user?.role === 'ADMIN';
        const where = isAdmin
            ? { ...(category && { category: category }) }
            : {
                is_published: true,
                published_at: { not: null },
                ...(category && { category: category }),
            };
        const [total, news] = await Promise.all([
            prisma_1.default.news.count({ where }),
            prisma_1.default.news.findMany({
                where,
                include: { category_rel: true },
                orderBy: { [sort]: order },
                skip,
                take: limit,
            }),
        ]);
        res.json({
            data: news,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});
// GET only published news (fully public)
router.get('/published', async (req, res) => {
    try {
        const { category } = req.query;
        const { page, limit, skip, sort, order } = buildPagination(req);
        const where = {
            is_published: true,
            published_at: { not: null },
        };
        if (category)
            where.category = category;
        const [total, news] = await Promise.all([
            prisma_1.default.news.count({ where }),
            prisma_1.default.news.findMany({
                where,
                include: { category_rel: true },
                orderBy: { [sort]: order },
                skip,
                take: limit,
            }),
        ]);
        res.json({
            data: news,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Error fetching published news:', error);
        res.status(500).json({ error: 'Failed to fetch published news' });
    }
});
// GET single news by ID (public only if published)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidUuid(id)) {
            return res.status(400).json({ error: 'Invalid news ID format' });
        }
        const isAdmin = req.user?.role === 'ADMIN';
        const newsItem = await prisma_1.default.news.findUnique({
            where: { id },
            include: { category_rel: true },
        });
        if (!newsItem) {
            return res.status(404).json({ error: 'News not found' });
        }
        if (!isAdmin && (!newsItem.is_published || !newsItem.published_at)) {
            return res.status(404).json({ error: 'News not found or not published' });
        }
        res.json(newsItem);
    }
    catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});
/* =============================================
   ADMIN-ONLY ROUTES (create, update, delete)
============================================= */
router.use(auth_1.authenticateToken);
// Admin-only middleware
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
};
router.use(requireAdmin);
/* CREATE NEWS */
router.post('/', async (req, res) => {
    try {
        const { title, content, category, image_url, is_published = false } = req.body;
        if (!title?.trim() || !content?.trim()) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        if (category) {
            const cat = await prisma_1.default.categories.findUnique({ where: { name: category } });
            if (!cat)
                return res.status(400).json({ error: 'Invalid category name' });
        }
        const newsItem = await prisma_1.default.news.create({
            data: {
                title: title.trim(),
                content: content.trim(),
                category: category || null,
                image_url: image_url || null,
                is_published,
                published_at: is_published ? new Date() : null,
            },
            include: { category_rel: true },
        });
        // Trigger Notification
        notificationService_1.notificationService.broadcastNotification('New News Alert', newsItem.title, { type: 'news', id: newsItem.id });
        res.status(201).json(newsItem);
    }
    catch (error) {
        console.error('Error creating news:', error);
        res.status(500).json({ error: 'Failed to create news' });
    }
});
/* UPDATE NEWS */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidUuid(id)) {
            return res.status(400).json({ error: 'Invalid news ID format' });
        }
        const data = req.body;
        if (data.category) {
            const cat = await prisma_1.default.categories.findUnique({ where: { name: data.category } });
            if (!cat)
                return res.status(400).json({ error: 'Invalid category name' });
        }
        const updateData = {
            ...(data.title !== undefined && { title: data.title.trim() }),
            ...(data.content !== undefined && { content: data.content.trim() }),
            ...(data.category !== undefined && { category: data.category || null }),
            ...(data.image_url !== undefined && { image_url: data.image_url || null }),
            ...(data.is_published !== undefined && { is_published: data.is_published }),
        };
        // Auto-set published_at when first publishing
        const existing = await prisma_1.default.news.findUnique({ where: { id } });
        if (data.is_published && !existing?.published_at) {
            updateData.published_at = new Date();
        }
        const updated = await prisma_1.default.news.update({
            where: { id },
            data: updateData,
            include: { category_rel: true },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating news:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'News not found' });
        }
        res.status(500).json({ error: 'Failed to update news' });
    }
});
/* PUBLISH / UNPUBLISH */
router.patch('/:id/publish', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_published } = req.body;
        if (!isValidUuid(id)) {
            return res.status(400).json({ error: 'Invalid news ID format' });
        }
        if (is_published === undefined) {
            return res.status(400).json({ error: 'is_published is required' });
        }
        const updated = await prisma_1.default.news.update({
            where: { id },
            data: {
                is_published,
                published_at: is_published ? new Date() : null,
            },
            include: { category_rel: true },
        });
        // Trigger Notification if published
        if (is_published) {
            notificationService_1.notificationService.broadcastNotification('New News Alert', updated.title, { type: 'news', id: updated.id });
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Error publishing news:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'News not found' });
        }
        res.status(500).json({ error: 'Failed to update publish status' });
    }
});
/* DELETE NEWS */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidUuid(id)) {
            return res.status(400).json({ error: 'Invalid news ID format' });
        }
        await prisma_1.default.news.delete({ where: { id } });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting news:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'News not found' });
        }
        res.status(500).json({ error: 'Failed to delete news' });
    }
});
exports.default = router;
//# sourceMappingURL=news.js.map