import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { notificationService } from '../services/notificationService';

const router = Router();

/* =============================================
   PUBLIC READ ROUTES (No auth required)
============================================= */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,
      category,
      category_id,
      tag,
      page = '1',
      limit = '10',
      sort = 'created_at',
      order = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string))); // cap at 100
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Public by default? Or only published?
    // Let's show only "published" articles to the public
    where.status = 'published';

    if (status) where.status = status as string;
    if (category) where.category = { contains: category as string, mode: 'insensitive' };
    if (category_id) where.category_id = category_id as string;
    if (tag) where.tags = { has: tag as string };

    const [total, articles] = await Promise.all([
      prisma.articles.count({ where }),
      prisma.articles.findMany({
        where,
        orderBy: { [sort as string]: order === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          title: true,
          subtitle: true,
          author_name: true,
          author_avatar: true,
          date: true,
          read_time: true,
          category: true,
          content: true,
          tags: true,
          image_url: true,
          slug: true,
          meta_description: true,
          keywords: true,
          status: true,
          scheduled_date: true,
          image_alt_text: true,
          category_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
    ]);

    res.json({
      data: articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const article = await prisma.articles.findUnique({
      where: { id: req.params.id },
    });

    if (!article || article.status !== 'published') {
      return res.status(404).json({ error: 'Article not found or not published' });
    }

    res.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

router.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const article = await prisma.articles.findFirst({
      where: { slug: req.params.slug },
    });

    if (!article || article.status !== 'published') {
      return res.status(404).json({ error: 'Article not found or not published' });
    }

    res.json(article);
  } catch (error) {
    console.error('Error fetching article by slug:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

/* =============================================
   ADMIN-ONLY ROUTES BELOW
   → All require authentication + ADMIN role
============================================= */
router.use(authenticateToken);

// Admin role check middleware
const requireAdmin = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

router.use(requireAdmin);

/* POST → Create article */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title, subtitle, author_name, author_avatar, date, read_time,
      category, content, tags, image_url, slug, meta_description,
      keywords, status = 'draft', scheduled_date, image_alt_text, category_id
    } = req.body;

    if (!title || !content || !author_name || !image_url) {
      return res.status(400).json({ error: 'Title, content, author, and image are required' });
    }

    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    const article = await prisma.articles.create({
      data: {
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        author_name: author_name.trim(),
        author_avatar: author_avatar.trim(),
        date: date || new Date().toISOString().split('T')[0],
        read_time: read_time || '5 min',
        category: category?.trim() || null,
        content: content.trim(),
        tags: tags || [],
        image_url: image_url.trim(),
        slug: slug?.trim() || null,
        meta_description: meta_description?.trim() || null,
        keywords: keywords?.trim() || null,
        status,
        scheduled_date: scheduled_date || null,
        image_alt_text: image_alt_text?.trim() || null,
        category_id: category_id || null,
      },
    });

    // Trigger Notification if published
    if (article.status === 'published') {
      notificationService.broadcastNotification(
        'New Article Published',
        `Check out: ${article.title}`,
        { type: 'article', id: article.id }
      );
    }

    res.status(201).json(article);
  } catch (error: any) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

/* PUT → Full update */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.tags && !Array.isArray(data.tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    const article = await prisma.articles.update({
      where: { id },
      data: {
        ...data,
        title: data.title?.trim(),
        subtitle: data.subtitle?.trim() || null,
        content: data.content?.trim(),
        tags: data.tags || undefined,
      },
    });

    res.json(article);
  } catch (error: any) {
    console.error('Error updating article:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Article not found' });
    res.status(500).json({ error: 'Failed to update article' });
  }
});

/* PATCH → Update status only (e.g. publish/draft) */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const article = await prisma.articles.update({
      where: { id },
      data: { status },
    });

    // Trigger Notification if status changed to published
    if (status === 'published') {
      notificationService.broadcastNotification(
        'New Article Published',
        `Check out: ${article.title}`,
        { type: 'article', id: article.id }
      );
    }

    res.json(article);
  } catch (error: any) {
    console.error('Error updating status:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Article not found' });
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/* DELETE → Remove article */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.articles.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting article:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Article not found' });
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

export default router;