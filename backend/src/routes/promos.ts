import express, { Request, Response, NextFunction } from 'express';
import { PromoOffer } from '../models/PromoOffer';
import mongoose, { Document } from 'mongoose';
import { upload, validateUploadedFiles } from '../middleware/fileUpload';
import fs from 'fs';
import { uploadToYOS } from '../services/yos';

// Define interface for PromoCode document
interface IPromoCode extends Document {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  usageCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const router = express.Router();

// Middleware для обработки ошибок в маршрутах
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Модель промокода
const PromoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  description: {
    type: String,
    required: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxDiscountAmount: {
    type: Number,
    default: 0,
  },
  usageLimit: {
    type: Number,
    default: 0,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

// Создаем модель если ее еще нет
let PromoCode: mongoose.Model<IPromoCode>;
try {
  PromoCode = mongoose.model<IPromoCode>('PromoCode');
} catch (error) {
  PromoCode = mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);
}

// Получить все промо-акции
router.get('/', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  console.log('GET /promos - Fetching all promo offers');
  
  const promos = await PromoOffer.find({}).sort({ order: 1 }).lean();
  
  console.log(`GET /promos - Found ${promos.length} promo offers`);
  res.json(promos || []);
}));

// Обновление порядка промо-акций - перемещено выше, чтобы не конфликтовать с /:id
router.put('/order', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('PUT /promos/order - Updating promo order');
    
    const { promos } = req.body;
    
    if (!Array.isArray(promos)) {
      return res.status(400).json({ message: 'Promos should be an array' });
    }
    
    // Используем операцию массового обновления через Promise.all
    await Promise.all(
      promos.map(item => {
        if (!item._id || !mongoose.isValidObjectId(item._id)) {
          throw new Error(`Invalid promo ID: ${item._id}`);
        }
        
        return PromoOffer.findByIdAndUpdate(
          item._id,
          { order: item.order },
          { new: true, runValidators: true }
        );
      })
    );
    
    const updatedPromos = await PromoOffer.find({
      _id: { $in: promos.map(item => item._id) }
    }).lean();
    
    console.log(`Updated order for ${updatedPromos.length} promos`);
    res.json(updatedPromos);
  } catch (error) {
    console.error('Error updating promo order:', error);
    res.status(500).json({ message: 'Failed to update promo order' });
  }
}));

// МАРШРУТЫ ДЛЯ ПРОМОКОДОВ

// Получить все промокоды
router.get('/codes', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  console.log('GET /promos/codes - Fetching all promo codes');
  
  const promoCodes = await PromoCode.find({}).sort({ createdAt: -1 }).lean();
  
  console.log(`GET /promos/codes - Found ${promoCodes.length} promo codes`);
  res.json(promoCodes || []);
}));

// Проверить промокод
router.post('/codes/verify', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('POST /promos/codes/verify - Verifying promo code');
    
    const { code, orderAmount } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Promo code is required' });
    }
    
    const promoCode = await PromoCode.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).lean();
    
    if (!promoCode) {
      return res.status(404).json({ message: 'Promo code not found or inactive' });
    }
    
    // Проверяем, не исчерпан ли лимит использования
    if (promoCode.usageLimit > 0 && promoCode.usageCount >= promoCode.usageLimit) {
      return res.status(400).json({ message: 'Promo code usage limit reached' });
    }
    
    // Проверяем минимальную сумму заказа
    if (orderAmount < promoCode.minOrderAmount) {
      return res.status(400).json({ 
        message: `Minimum order amount not reached. Required: ${promoCode.minOrderAmount} rubles` 
      });
    }
    
    console.log('Promo code verified successfully:', promoCode.code);
    res.json(promoCode);
  } catch (error) {
    console.error('Error verifying promo code:', error);
    res.status(500).json({ message: 'Failed to verify promo code' });
  }
}));

// Создать новый промокод
router.post('/codes', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('POST /promos/codes - Creating new promo code:', req.body);
    
    // Преобразование кода в верхний регистр
    if (req.body.code) {
      req.body.code = req.body.code.toUpperCase();
    }
    
    const promoCode = new PromoCode({
      code: req.body.code,
      description: req.body.description,
      discountType: req.body.discountType,
      discountValue: req.body.discountValue,
      minOrderAmount: req.body.minOrderAmount || 0,
      maxDiscountAmount: req.body.maxDiscountAmount || 0,
      usageLimit: req.body.usageLimit || 0,
      usageCount: 0,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });
    
    const validationError = promoCode.validateSync();
    if (validationError) {
      console.error('Validation error:', validationError);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: Object.values((validationError as any).errors || {}).map((err: any) => err.message)
      });
    }
    
    // Проверяем, существует ли уже промокод с таким кодом
    const existingPromoCode = await PromoCode.findOne({ code: promoCode.code });
    if (existingPromoCode) {
      return res.status(400).json({ message: 'Promo code with this code already exists' });
    }
    
    await promoCode.save();
    console.log('Promo code created successfully with ID:', promoCode._id);
    res.status(201).json(promoCode);
  } catch (error) {
    console.error('Error creating promo code:', error);
    res.status(500).json({ 
      message: 'Failed to create promo code',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Обновить промокод
router.put('/codes/:id', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log(`PUT /promos/codes/${req.params.id} - Updating promo code`);
    
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid promo code ID format' });
    }
    
    const updateData: any = {};
    
    if (req.body.code !== undefined) updateData.code = req.body.code.toUpperCase();
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.discountType !== undefined) updateData.discountType = req.body.discountType;
    if (req.body.discountValue !== undefined) updateData.discountValue = req.body.discountValue;
    if (req.body.minOrderAmount !== undefined) updateData.minOrderAmount = req.body.minOrderAmount;
    if (req.body.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = req.body.maxDiscountAmount;
    if (req.body.usageLimit !== undefined) updateData.usageLimit = req.body.usageLimit;
    if (req.body.usageCount !== undefined) updateData.usageCount = req.body.usageCount;
    if (req.body.startDate !== undefined) updateData.startDate = req.body.startDate;
    if (req.body.endDate !== undefined) updateData.endDate = req.body.endDate;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    
    const promoCode = await PromoCode.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!promoCode) {
      return res.status(404).json({ message: 'Promo code not found' });
    }
    
    console.log('Promo code updated successfully:', promoCode._id);
    res.json(promoCode);
  } catch (error) {
    console.error('Error updating promo code:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: Object.values((error as any).errors || {}).map((err: any) => err.message)
      });
    }
    
    res.status(500).json({ message: 'Failed to update promo code' });
  }
}));

// Удалить промокод
router.delete('/codes/:id', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log(`DELETE /promos/codes/${req.params.id}`);
    
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid promo code ID format' });
    }
    
    const promoCode = await PromoCode.findByIdAndDelete(req.params.id);
    
    if (!promoCode) {
      return res.status(404).json({ message: 'Promo code not found' });
    }
    
    console.log('Promo code deleted successfully:', req.params.id);
    res.json({ message: 'Promo code deleted successfully' });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({ message: 'Failed to delete promo code' });
  }
}));

// Загрузка изображения для промо-акции
router.post('/upload', upload.single('file'), validateUploadedFiles, asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    // Если YOS не настроен, используем локальный URL
    if (!process.env.YOS_BUCKET || !process.env.YOS_ENDPOINT) {
      const localUrl = `/uploads/${req.file.filename}`;
      return res.json({ url: localUrl });
    }
    const url = await uploadToYOS(req.file.path);
    fs.unlinkSync(req.file.path);
    res.json({ url });
  } catch (e) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Upload to YOS failed' });
  }
}));

// Получить промо-акцию по ID
router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  console.log(`GET /promos/${req.params.id}`);
  
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid promo ID format' });
  }
  
  const promo = await PromoOffer.findById(req.params.id).lean();
  if (!promo) {
    return res.status(404).json({ message: 'Promo offer not found' });
  }
  
  res.json(promo);
}));

// Создать новую промо-акцию
router.post('/', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('POST /promos - Creating new promo offer:', req.body);
    
    const promoData = {
      title: req.body.title,
      imageUrl: req.body.imageUrl,
      targetUrl: req.body.targetUrl || '',
      order: req.body.order || 0,
      startDate: req.body.startDate || new Date(),
      endDate: req.body.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    };
    
    const promo = new PromoOffer(promoData);
    
    const validationError = promo.validateSync();
    if (validationError) {
      console.error('Validation error:', validationError);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: Object.values((validationError as any).errors || {}).map((err: any) => err.message)
      });
    }
    
    await promo.save();
    console.log('Promo offer created successfully with ID:', promo._id);
    res.status(201).json(promo);
  } catch (error: any) {
    console.error('Error creating promo offer:', error);
    
    res.status(500).json({ 
      message: 'Failed to create promo offer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Обновить промо-акцию
router.put('/:id', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log(`PUT /promos/${req.params.id} - Updating promo offer`);
    
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid promo ID format' });
    }
    
    const updateData: any = {};
    
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.imageUrl !== undefined) updateData.imageUrl = req.body.imageUrl;
    if (req.body.targetUrl !== undefined) updateData.targetUrl = req.body.targetUrl;
    if (req.body.order !== undefined) updateData.order = req.body.order;
    if (req.body.startDate !== undefined) updateData.startDate = req.body.startDate;
    if (req.body.endDate !== undefined) updateData.endDate = req.body.endDate;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    
    const promo = await PromoOffer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!promo) {
      return res.status(404).json({ message: 'Promo offer not found' });
    }
    
    console.log('Promo offer updated successfully:', promo._id);
    res.json(promo);
  } catch (error: any) {
    console.error('Error updating promo offer:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ message: 'Failed to update promo offer' });
  }
}));

// Удалить промо-акцию
router.delete('/:id', asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    console.log(`DELETE /promos/${req.params.id}`);
    
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid promo ID format' });
    }
    
    const promo = await PromoOffer.findByIdAndDelete(req.params.id);
    
    if (!promo) {
      return res.status(404).json({ message: 'Promo offer not found' });
    }
    
    console.log('Promo offer deleted successfully:', req.params.id);
    res.json({ message: 'Promo offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting promo offer:', error);
    res.status(500).json({ message: 'Failed to delete promo offer' });
  }
}));

export default router;