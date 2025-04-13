import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

const CartSchema = new mongoose.Schema({
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  metadata: {
    appliedPromoCode: String,
    discount: Number,
    deliveryCost: Number,
    freeDelivery: Boolean,
    subtotal: Number,
    lastUpdated: { type: Date, default: Date.now }
  },
  shareId: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Удаляем через 24 часа
});

const Cart = mongoose.model('Cart', CartSchema);

// Добавляем новый эндпоинт для обработки POST /cart запросов
router.post('/', async (req, res) => {
  try {
    // Генерируем уникальный ID для корзины
    const cartId = new mongoose.Types.ObjectId().toString();
    
    const cart = new Cart({
      items: req.body.items || [],
      metadata: req.body.metadata || {},
      shareId: cartId
    });
    
    await cart.save();
    
    res.json({ 
      cartId, 
      message: 'Cart created successfully',
      success: true
    });
  } catch (error) {
    console.error('Error creating cart:', error);
    res.status(500).json({ 
      error: 'Failed to create cart', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Добавляем эндпоинт для обновления корзины
router.put('/:cartId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ shareId: req.params.cartId });
    
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    cart.items = req.body.items || cart.items;
    
    if (req.body.metadata) {
      cart.metadata = {
        ...cart.metadata,
        ...req.body.metadata,
        lastUpdated: new Date()
      };
    }
    
    await cart.save();
    
    res.json({ 
      cartId: cart.shareId, 
      message: 'Cart updated successfully',
      success: true
    });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ 
      error: 'Failed to update cart', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/share', async (req, res) => {
  try {
    const shareId = Math.random().toString(36).substr(2, 9);
    const cart = new Cart({
      items: req.body.items,
      metadata: req.body.metadata || {},
      shareId
    });
    await cart.save();
    res.json({ shareId });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при сохранении корзины' });
  }
});

router.get('/:shareId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ shareId: req.params.shareId });
    if (!cart) {
      return res.status(404).json({ message: 'Корзина не найдена' });
    }
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении корзины' });
  }
});

export default router;
