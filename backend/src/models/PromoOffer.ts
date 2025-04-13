import mongoose from 'mongoose';

const PromoOfferSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Promo title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Promo description is required'],
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Promo image URL is required'],
    trim: true
  },
  linkUrl: {
    type: String,
    required: [true, 'Promo link URL is required'],
    trim: true
  },
  buttonText: {
    type: String,
    required: [true, 'Button text is required'],
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // По умолчанию +30 дней
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export const PromoOffer = mongoose.model('PromoOffer', PromoOfferSchema);