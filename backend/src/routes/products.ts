import express from 'express';
import { Product } from '../models/Product';
import mongoose from 'mongoose';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Get a single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

// Create a product
router.post('/', async (req, res) => {
  try {
    const { name, price, description, imageUrl, category, newCategory } = req.body;
    
    // Use new category if provided
    const finalCategory = category === 'new-category' ? newCategory : category;
    
    if (!finalCategory) {
      return res.status(400).json({ message: 'Category is required' });
    }

    const product = new Product({
      name,
      price,
      description,
      imageUrl,
      category: finalCategory
    });

    const validationError = product.validateSync();
    if (validationError) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: Object.values(validationError.errors).map(err => err.message)
      });
    }

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Update a product
router.put('/:id', async (req, res) => {
  try {
    const { name, price, description, imageUrl, category, newCategory } = req.body;
    
    // Use new category if provided
    const finalCategory = category === 'new-category' ? newCategory : category;
    
    if (!finalCategory) {
      return res.status(400).json({ message: 'Category is required' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        price,
        description,
        imageUrl,
        category: finalCategory
      },
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
});

// Delete a product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

export default router;
