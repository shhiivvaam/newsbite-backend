// routes/categories.ts
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { notificationService } from '../services/notificationService';

const router = Router();

/* -------------------------------------------
   UTILITY: Generate Random Hex Color
------------------------------------------- */
function generateRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

/* -------------------------------------------
   GET all categories → Public (no auth needed)
------------------------------------------- */
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.categories.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        created_at: true,
        updated_at: true,
      },
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/* -------------------------------------------
   GET single category by ID → Public
------------------------------------------- */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await prisma.categories.findUnique({
      where: { id },
      select: { id: true, name: true, color: true, created_at: true, updated_at: true },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

/* -------------------------------------------
   ADMIN ONLY ROUTES BELOW
------------------------------------------- */
router.use(authenticateToken); // ← All routes below require login

// Middleware to check if user is ADMIN
const requireAdmin = (req: AuthRequest, res: Response, next: Function) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

// Apply admin check to all write operations
router.use(requireAdmin);

/* -------------------------------------------
   POST create new category → ADMIN ONLY
------------------------------------------- */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required and must be a string' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }

    const category = await prisma.categories.create({
      data: {
        name: trimmedName,
        color: color && typeof color === 'string' ? color : generateRandomColor(),
      },
    });

    // Trigger Notification
    notificationService.broadcastNotification(
      'New Category Added',
      `Check out the new category: ${category.name}`,
      { type: 'category', id: category.id }
    );

    res.status(201).json(category);
  } catch (error: any) {
    console.error('Error creating category:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    res.status(500).json({ error: 'Failed to create category' });
  }
});

/* -------------------------------------------
   PUT update category → ADMIN ONLY
------------------------------------------- */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required and must be a string' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }

    const category = await prisma.categories.update({
      where: { id },
      data: {
        name: trimmedName,
        color: color && typeof color === 'string' ? color : generateRandomColor(),
      },
    });

    res.json(category);
  } catch (error: any) {
    console.error('Error updating category:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    res.status(500).json({ error: 'Failed to update category' });
  }
});

/* -------------------------------------------
   DELETE category → ADMIN ONLY
------------------------------------------- */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.categories.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting category:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Optional: Handle foreign key constraint if news exists
    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'Cannot delete category with associated news articles',
      });
    }

    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;