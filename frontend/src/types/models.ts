export interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  images: string[]; // Новый массив фото, первая — основная
  categories?: string[];
  sizes?: string[];  // available sizes
  colors?: string[]; // available colors
  sizeGroup?: string; // size group identifier
  characteristics?: Array<{ name: string; value: string }>;
  videoUrl?: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;  // chosen size
  selectedColor?: string; // chosen color
  selectedShoeSize?: string; // chosen shoe size
}

// Обновляем интерфейс корзины, добавляем поля для работы с доставкой и промокодами
export interface Cart {
  items: CartItem[];
  total: number;
  subtotal?: number; // Подытог без учета скидок
  deliveryCost?: number; // Стоимость доставки
  discount?: number; // Сумма скидки
  appliedPromoCode?: PromoCode; // Примененный промокод
  freeDelivery?: boolean; // Флаг бесплатной доставки
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromoOffer {
  _id: string;
  title: string;
  imageUrl: string;
  order: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  targetUrl?: string; // добавлено поле для конечного url
}

// Новый интерфейс для промокодов
export interface PromoCode {
  _id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed'; // Тип скидки: процент или фиксированная сумма
  discountValue: number; // Значение скидки (процент или сумма в рублях)
  minOrderAmount: number; // Минимальная сумма заказа для применения промокода
  maxDiscountAmount?: number; // Максимальная сумма скидки (для процентных промокодов)
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  usageLimit?: number; // Ограничение по количеству использований
  usageCount: number; // Текущее количество использований
  createdAt: Date;
  updatedAt: Date;
}

// Интерфейс для настроек доставки
export interface DeliverySettings {
  defaultCost: number; // Стандартная стоимость доставки
  freeDeliveryThreshold: number; // Порог для бесплатной доставки (5000 рублей)
}