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
  shareId: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Удаляем через 24 часа
});

const Cart = mongoose.model('Cart', CartSchema);

router.post('/share', async (req, res) => {
  try {
    const shareId = Math.random().toString(36).substr(2, 9);
    const cart = new Cart({
      items: req.body.items,
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
