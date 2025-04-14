import express from 'express';
import { Product } from '../models/Product';
import { Category } from '../models/Category';

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

    // Поиск продуктов через Mongoose
    const products = await Product.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .select('id name price imageUrl')
      .limit(5)
      .lean();

    // Поиск категорий через Mongoose
    const categories = await Category.find({
      name: { $regex: searchTerm, $options: 'i' }
    })
      .select('id name imageUrl')
      .limit(3)
      .lean();

    // Форматируем результаты
    const formattedResults = [
      ...products.map((product: any) => ({
        id: product.id || product._id,
        name: product.name,
        type: 'product' as const,
        image: product.imageUrl,
        price: product.price
      })),
      ...categories.map((category: any) => ({
        id: category.id || category._id,
        name: category.name,
        type: 'category' as const,
        image: category.imageUrl
      }))
    ];

    res.json(formattedResults);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;