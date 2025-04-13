import express, { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import mongoose from 'mongoose';

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
    console.log(`Filtering products by category: ${category}`);
    query = { 
      $or: [
        { category: category },
        { categories: category }
      ]
    };
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
    const { 
      name, 
      price, 
      description, 
      imageUrl, 
      category, 
      categories,
      newCategory, 
      additionalImages, 
      videoUrl 
    } = req.body;
    
    // Обрабатываем категории
    let finalCategories: string[] = [];
    
    // Если предоставлен массив категорий, используем его
    if (categories && Array.isArray(categories) && categories.length > 0) {
      finalCategories = categories as string[];
    } 
    // Если есть одна категория, используем её
    else if (category && category !== 'new-category') {
      finalCategories = [category as string];
    }
    // Если создаём новую категорию
    else if (category === 'new-category' && newCategory) {
      finalCategories = [newCategory as string];
    }
    
    if (finalCategories.length === 0) {
      console.log('At least one category is required - returning 400');
      return res.status(400).json({ message: 'At least one category is required' });
    }

    // Подготавливаем данные продукта
    const productData: {
      name: any;
      price: any;
      description: any;
      imageUrl: any;
      category: string;
      categories: string[];
      additionalImages?: string[];
      videoUrl?: string;
    } = {
      name,
      price,
      description,
      imageUrl,
      category: finalCategories[0], // Основная категория - первая в списке
      categories: finalCategories
    };

    // Добавляем необязательные поля, только если они предоставлены
    if (additionalImages && Array.isArray(additionalImages)) {
      productData.additionalImages = additionalImages;
    }
    
    if (videoUrl) {
      productData.videoUrl = videoUrl;
    }

    console.log('Creating product with validated data:', productData);
    
    try {
      const product = new Product(productData);

      const validationError = product.validateSync();
      if (validationError) {
        console.error('Validation error:', validationError);
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: Object.values(validationError.errors).map(err => err.message)
        });
      }

      console.log('Saving product to database...');
      await product.save();
      console.log('Product created successfully with ID:', product._id);
      return res.status(201).json(product);
    } catch (dbError) {
      console.error('Database error during product creation:', dbError);
      return res.status(500).json({ 
        message: 'Database error during product creation',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }
  } catch (error) {
    console.error('Unexpected error creating product:', error);
    return res.status(500).json({ 
      message: 'Failed to create product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Update a product
router.put('/:id', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { 
      name, 
      price, 
      description, 
      imageUrl, 
      category, 
      categories,
      newCategory, 
      additionalImages, 
      videoUrl 
    } = req.body;
    
    // Обрабатываем категории
    let finalCategories: string[] = [];
    
    // Если предоставлен массив категорий, используем его
    if (categories && Array.isArray(categories) && categories.length > 0) {
      finalCategories = categories as string[];
    } 
    // Если есть одна категория, используем её
    else if (category && category !== 'new-category') {
      finalCategories = [category as string];
    }
    // Если создаём новую категорию
    else if (category === 'new-category' && newCategory) {
      finalCategories = [newCategory as string];
    }
    
    if (finalCategories.length === 0) {
      return res.status(400).json({ message: 'At least one category is required' });
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      name,
      price,
      description,
      imageUrl,
      category: finalCategories[0], // Основная категория - первая в списке
      categories: finalCategories
    };

    // Добавляем дополнительные изображения, если они предоставлены
    if (additionalImages && Array.isArray(additionalImages)) {
      updateData.additionalImages = additionalImages;
    }
    
    // Добавляем URL видео, если он предоставлен
    if (videoUrl !== undefined) {
      updateData.videoUrl = videoUrl;
    }

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
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product' });
  }
}));

export default router;
