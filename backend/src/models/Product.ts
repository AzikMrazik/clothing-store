import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0.01, 'Price must be greater than 0']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Product main image URL is required'],
    trim: true
  },
  additionalImages: {
    type: [String],
    default: []
  },
  videoUrl: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    trim: true
  }
}, {
  timestamps: true
});

export const Product = mongoose.model('Product', ProductSchema);