import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation';
import Order from '../models/Order';

const router = Router();

const orderValidation = [
  body('items').isArray().notEmpty().withMessage('Order must contain items'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Invalid quantity'),
  body('customerInfo').isObject().notEmpty().withMessage('Customer info is required'),
  body('customerInfo.firstName').trim().isLength({ min: 2 }).withMessage('First name is required'),
  body('customerInfo.lastName').trim().isLength({ min: 2 }).withMessage('Last name is required'),
  body('customerInfo.email').isEmail().withMessage('Valid email is required'),
  body('customerInfo.phone').matches(/^\+?[\d\s-]{10,}$/).withMessage('Valid phone number is required'),
  body('customerInfo.address').trim().notEmpty().withMessage('Address is required'),
  body('customerInfo.city').trim().notEmpty().withMessage('City is required'),
  body('customerInfo.zipCode').matches(/^\d{5,6}$/).withMessage('Valid zip code is required'),
  body('total').isFloat({ min: 0 }).withMessage('Invalid total amount')
];

// Create new order
router.post('/', validate(orderValidation), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json({
      status: 'success',
      data: order
    });
  } catch (err) {
    next(err);
  }
});

// Get orders (admin only)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 });
    res.json({
      status: 'success',
      data: orders
    });
  } catch (err) {
    next(err);
  }
});

// Get order by ID
router.get('/:id', 
  param('id').isMongoId(), 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) {
        return res.status(400).json({
          status: 'error',
          message: 'Order ID is required'
        });
      }

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({
          status: 'error',
          message: 'Order not found'
        });
      }
      res.json({
        status: 'success',
        data: order
      });
    } catch (err) {
      next(err);
    }
  }
);

// Update order status (admin only)
router.patch('/:id/status',
  [
    param('id').isMongoId(),
    body('status')
      .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid status')
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) {
        return res.status(400).json({
          status: 'error',
          message: 'Order ID is required'
        });
      }

      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      );
      
      if (!order) {
        return res.status(404).json({
          status: 'error',
          message: 'Order not found'
        });
      }

      res.json({
        status: 'success',
        data: order
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;