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
  // Изменяем тип поля категорий на массив строк
  categories: {
    type: [String],
    default: []
  },
  // Сохраняем совместимость со старыми товарами
  category: {
    type: String,
    trim: true
  },
  images: {
    type: [String],
    default: [],
    required: true
  }
}, {
  timestamps: true
});

// Middleware для обеспечения обратной совместимости
ProductSchema.pre('save', function(next) {
  // Миграция старых полей в images
  if (!this.images || !Array.isArray(this.images)) this.images = [];
  if (this.imageUrl && !this.images.includes(this.imageUrl)) this.images.unshift(this.imageUrl);
  if (this.additionalImages && Array.isArray(this.additionalImages)) {
    this.additionalImages.forEach((img: string) => {
      if (img && !this.images.includes(img)) this.images.push(img);
    });
  }
  // Если указана основная категория, но нет массива категорий или он пуст
  if (this.category && (!this.categories || this.categories.length === 0)) {
    this.categories = [this.category];
  }
  // Если есть массив категорий, но не указана основная категория
  else if ((!this.category || this.category === '') && this.categories && this.categories.length > 0) {
    this.category = this.categories[0];
  }
  next();
});

// Также добавляем обработку для методов обновления
ProductSchema.pre('findOneAndUpdate', function(next) {
  const update: any = this.getUpdate();
  
  // Проверяем, есть ли в обновлении поля категорий
  if (update && update.category && (!update.categories || update.categories.length === 0)) {
    update.categories = [update.category];
  } 
  else if (update && (!update.category || update.category === '') && update.categories && update.categories.length > 0) {
    update.category = update.categories[0];
  }
  
  next();
});

export const Product = mongoose.model('Product', ProductSchema);