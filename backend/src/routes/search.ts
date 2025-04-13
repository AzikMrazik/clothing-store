import express from 'express';
import { prisma } from '../prisma';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const searchTerm = query.trim();

    if (!searchTerm) {
      return res.json([]);
    }

    // Поиск продуктов
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        price: true,
        images: true
      },
      take: 5
    });

    // Поиск категорий
    const categories = await prisma.category.findMany({
      where: {
        name: { contains: searchTerm, mode: 'insensitive' }
      },
      select: {
        id: true,
        name: true,
        image: true
      },
      take: 3
    });

    // Форматируем результаты
    const formattedResults = [
      ...products.map(product => ({
        id: product.id,
        name: product.name,
        type: 'product' as const,
        image: product.images?.[0],
        price: product.price
      })),
      ...categories.map(category => ({
        id: category.id,
        name: category.name,
        type: 'category' as const,
        image: category.image
      }))
    ];

    res.json(formattedResults);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;