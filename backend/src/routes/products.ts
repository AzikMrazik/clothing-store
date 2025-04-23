import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { uploadToYOS, deleteFromYOS } from '../services/yos';
import { upload, validateUploadedFiles } from '../middleware/fileUpload';
import fs from 'fs';

const router = express.Router();

// Middleware для обработки ошибок в маршрутах
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Get all products
router.get('/', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  console.log('GET /products - Fetching all products');
  
  // Добавляем поддержку поиска и фильтрации
  const { category, search } = req.query;
  let query: any = {};
  
  if (category) {
    console.log(`Filtering products by category slug: ${category}`);
    const catSlug = String(category);
    const categoryDoc = await Category.findOne({ slug: catSlug }).lean();
    if (categoryDoc) {
      const name = categoryDoc.name;
      query.$or = [ { category: name }, { categories: name } ];
    } else {
      // No such category, force empty result
      query.categories = null;
    }
  }

  if (search) {
    const searchRegex = new RegExp(String(search), 'i');
    query = {
      ...query,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        ...(query.$or || [])
      ]
    };
  }
  
  const products = await Product.find(query).lean();
  
  if (!products) {
    console.error('Products is null or undefined');
    return res.status(500).json({ message: 'Failed to fetch products - null result' });
  }
  
  console.log(`GET /products - Found ${products.length} products`);
  res.json(products || []);
}));

// Get all categories from products
router.get('/categories', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  console.log('GET /products/categories - Fetching all categories from products');
  
  // Получаем уникальные категории товаров из обоих полей
  const categoriesFromSingleField = await Product.distinct('category');
  const categoriesFromArray = await Product.distinct('categories');
  
  // Объединяем категории из обоих полей и удаляем дубликаты
  const allCategories = [...new Set([...categoriesFromSingleField, ...categoriesFromArray])];
  console.log(`Found ${allCategories.length} unique categories in products`);
  
  res.json(allCategories || []);
}));

// Get a single product by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  console.log(`GET /products/${req.params.id} - Fetching single product`);
  
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid product ID format' });
  }
  
  const product = await Product.findById(req.params.id).lean();
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  
  console.log(`GET /products/${req.params.id} - Product found`);
  res.json(product);
}));

// Create a product
router.post('/', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('POST /products - Creating new product with data:', JSON.stringify(req.body, null, 2));
    const { name, price, description, images, categories, newCategory, videoUrl, sizes, colors, sizeGroup } = req.body;

    let finalCategories: string[] = [];
    if (categories && Array.isArray(categories) && categories.length > 0) {
      finalCategories = categories as string[];
    } else if (newCategory) {
      finalCategories = [newCategory as string];
    }
    if (finalCategories.length === 0) {
      return res.status(400).json({ message: 'At least one category is required' });
    }
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }
    // Process sizes and colors
    const finalSizes: string[] = Array.isArray(sizes) ? sizes as string[] : [];
    const finalColors: string[] = Array.isArray(colors) ? colors as string[] : [];

    const productData: any = {
      name,
      price,
      description,
      imageUrl: images[0], // добавляем главное изображение для совместимости с моделью
      images,
      category: finalCategories[0],
      categories: finalCategories,
      videoUrl,
      sizes: finalSizes,
      colors: finalColors,
      sizeGroup
    };
    const product = new Product(productData);
    const validationError = product.validateSync();
    if (validationError) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: Object.values(validationError.errors).map(err => err.message)
      });
    }
    await product.save();
    return res.status(201).json(product);
  } catch (error) {
    return res.status(500).json({ 
      message: 'Failed to create product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Upload product image to YOS
router.post('/upload', upload.single('file'), validateUploadedFiles, asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const url = await uploadToYOS(req.file.path);
    fs.unlinkSync(req.file.path);
    res.json({ url });
  } catch (e) {
    fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Upload to YOS failed' });
  }
}));

// Update a product
router.put('/:id', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, price, description, images, categories, newCategory, videoUrl, sizes, colors, sizeGroup } = req.body;
    let finalCategories: string[] = [];
    if (categories && Array.isArray(categories) && categories.length > 0) {
      finalCategories = categories as string[];
    } else if (newCategory) {
      finalCategories = [newCategory as string];
    }
    if (finalCategories.length === 0) {
      return res.status(400).json({ message: 'At least one category is required' });
    }
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }
    // Process sizes and colors
    const finalSizes: string[] = Array.isArray(sizes) ? sizes as string[] : [];
    const finalColors: string[] = Array.isArray(colors) ? colors as string[] : [];
    const updateData: any = {
      name,
      price,
      description,
      imageUrl: images[0], // добавляем главное изображение
      images,
      category: finalCategories[0],
      categories: finalCategories,
      videoUrl,
      sizes: finalSizes,
      colors: finalColors,
      sizeGroup
    };
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: 'Failed to update product' });
  }
}));

// Delete a product
router.delete('/:id', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    // Удаление изображения из YOS
    if (product.imageUrl) {
      try { await deleteFromYOS(product.imageUrl); } catch {}
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product' });
  }
}));

export default router;
