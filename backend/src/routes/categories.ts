import express, { Request, Response, NextFunction } from 'express';
import { Category } from '../models/Category';
import mongoose from 'mongoose';

const router = express.Router();

// Middleware для обработки ошибок в маршрутах
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Получить все категории
router.get('/', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  console.log('GET /categories - Fetching all categories');
  
  const categories = await Category.find({}).sort({ order: 1 }).lean();
  
  console.log(`GET /categories - Found ${categories.length} categories`);
  res.json(categories || []);
}));

// Обновление порядка категорий - перемещено выше, чтобы не конфликтовать с /:id
router.put('/order', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('PUT /categories/order - Updating category order');
    
    const { categories } = req.body;
    
    if (!Array.isArray(categories)) {
      return res.status(400).json({ message: 'Categories should be an array' });
    }
    
    // Используем операцию массового обновления через Promise.all
    await Promise.all(
      categories.map(item => {
        if (!item._id || !mongoose.isValidObjectId(item._id)) {
          throw new Error(`Invalid category ID: ${item._id}`);
        }
        
        return Category.findByIdAndUpdate(
          item._id,
          { order: item.order },
          { new: true, runValidators: true }
        );
      })
    );
    
    const updatedCategories = await Category.find({
      _id: { $in: categories.map(item => item._id) }
    }).lean();
    
    console.log(`Updated order for ${updatedCategories.length} categories`);
    res.json(updatedCategories);
  } catch (error) {
    console.error('Error updating category order:', error);
    res.status(500).json({ message: 'Failed to update category order' });
  }
}));

// Получить категорию по ID
router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  console.log(`GET /categories/${req.params.id}`);
  
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid category ID format' });
  }
  
  const category = await Category.findById(req.params.id).lean();
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }
  
  res.json(category);
}));

// Создать новую категорию
router.post('/', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('POST /categories - Creating new category:', req.body);
    
    const categoryData = {
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      order: req.body.order || 0,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    };
    
    const category = new Category(categoryData);
    
    const validationError = category.validateSync();
    if (validationError) {
      console.error('Validation error:', validationError);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: Object.values(validationError.errors).map(err => err.message)
      });
    }
    
    await category.save();
    console.log('Category created successfully with ID:', category._id);
    res.status(201).json(category);
  } catch (error: any) {
    console.error('Error creating category:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category with this slug already exists' });
    }
    
    res.status(500).json({ 
      message: 'Failed to create category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Обновить категорию
router.put('/:id', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log(`PUT /categories/${req.params.id} - Updating category`);
    
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid category ID format' });
    }
    
    const updateData: any = {};
    
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.slug !== undefined) updateData.slug = req.body.slug;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.imageUrl !== undefined) updateData.imageUrl = req.body.imageUrl;
    if (req.body.order !== undefined) updateData.order = req.body.order;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    console.log('Category updated successfully:', category._id);
    res.json(category);
  } catch (error: any) {
    console.error('Error updating category:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category with this slug already exists' });
    }
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ message: 'Failed to update category' });
  }
}));

// Удалить категорию
router.delete('/:id', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log(`DELETE /categories/${req.params.id}`);
    
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid category ID format' });
    }
    
    const category = await Category.findByIdAndDelete(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    console.log('Category deleted successfully:', req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
}));

export default router;