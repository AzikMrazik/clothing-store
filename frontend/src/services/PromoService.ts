import { API_URL, API_DEBUG } from '../config';
import { PromoOffer, PromoCode, DeliverySettings } from '../types/models';

export class PromoService {
  static async fetchPromoOffers(): Promise<PromoOffer[]> {
    if (API_DEBUG) {
      console.log(`Fetching promo offers from: ${API_URL}/promos`);
    }

    try {
      const response = await fetch(`${API_URL}/promos`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (API_DEBUG) {
        console.log(`Received ${data.length} promo offers from API`);
      }
      return data;
    } catch (error) {
      console.error(`Error fetching promo offers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to load promo offers. Please check your connection and try again.');
    }
  }

  static async updatePromoOrder(promos: Pick<PromoOffer, '_id' | 'order'>[]): Promise<PromoOffer[]> {
    if (API_DEBUG) {
      console.log(`Updating promo order: ${API_URL}/promos/order`);
    }

    try {
      const response = await fetch(`${API_URL}/promos/order`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ promos })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error updating promo order: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to update promo order. Please try again.');
    }
  }

  static async createPromoOffer(promo: Omit<PromoOffer, '_id' | 'createdAt' | 'updatedAt'>): Promise<PromoOffer> {
    if (API_DEBUG) {
      console.log(`Creating new promo offer: ${API_URL}/promos`);
    }

    try {
      const response = await fetch(`${API_URL}/promos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(promo)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error creating promo offer: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to create promo offer. Please try again.');
    }
  }

  static async updatePromoOffer(id: string, promo: Partial<Omit<PromoOffer, '_id' | 'createdAt' | 'updatedAt'>>): Promise<PromoOffer> {
    if (API_DEBUG) {
      console.log(`Updating promo offer: ${API_URL}/promos/${id}`);
    }

    try {
      const response = await fetch(`${API_URL}/promos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(promo)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error updating promo offer: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to update promo offer. Please try again.');
    }
  }

  static async deletePromoOffer(id: string): Promise<void> {
    if (API_DEBUG) {
      console.log(`Deleting promo offer: ${API_URL}/promos/${id}`);
    }

    try {
      const response = await fetch(`${API_URL}/promos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error deleting promo offer: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to delete promo offer. Please try again.');
    }
  }

  // Методы для работы с промокодами
  static async fetchPromoCodes(): Promise<PromoCode[]> {
    if (API_DEBUG) {
      console.log(`Fetching promo codes from: ${API_URL}/promos/codes`);
    }

    try {
      const response = await fetch(`${API_URL}/promos/codes`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (API_DEBUG) {
        console.log(`Received ${data.length} promo codes from API`);
      }
      return data;
    } catch (error) {
      console.error(`Error fetching promo codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to load promo codes. Please check your connection and try again.');
    }
  }

  static async verifyPromoCode(code: string, orderAmount: number): Promise<PromoCode | null> {
    if (API_DEBUG) {
      console.log(`Verifying promo code: ${API_URL}/promos/codes/verify`);
    }

    try {
      const response = await fetch(`${API_URL}/promos/codes/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ code, orderAmount })
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Промокод не найден
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error verifying promo code: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to verify promo code. Please try again.');
    }
  }

  static async applyPromoCode(code: string, orderAmount: number): Promise<{ 
    promoCode: PromoCode | null, 
    discount: number, 
    error?: string 
  }> {
    try {
      const promoCode = await this.verifyPromoCode(code, orderAmount);
      
      if (!promoCode) {
        return { promoCode: null, discount: 0, error: 'Invalid promo code' };
      }
      
      // Проверяем минимальную сумму заказа
      if (orderAmount < promoCode.minOrderAmount) {
        return { 
          promoCode: null, 
          discount: 0, 
          error: `This promo code requires a minimum order of ${promoCode.minOrderAmount} rubles` 
        };
      }
      
      // Рассчитываем скидку
      let discount = 0;
      if (promoCode.discountType === 'percentage') {
        discount = (orderAmount * promoCode.discountValue) / 100;
        
        // Проверяем максимальную сумму скидки, если указана
        if (promoCode.maxDiscountAmount && discount > promoCode.maxDiscountAmount) {
          discount = promoCode.maxDiscountAmount;
        }
      } else {
        // Фиксированная скидка
        discount = promoCode.discountValue;
        
        // Скидка не может быть больше суммы заказа
        if (discount > orderAmount) {
          discount = orderAmount;
        }
      }
      
      return { promoCode, discount };
    } catch (error) {
      console.error(`Error applying promo code: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { promoCode: null, discount: 0, error: 'Failed to apply promo code. Please try again.' };
    }
  }

  static async createPromoCode(promoCode: Omit<PromoCode, '_id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<PromoCode> {
    if (API_DEBUG) {
      console.log(`Creating new promo code: ${API_URL}/promos/codes`);
    }

    try {
      const response = await fetch(`${API_URL}/promos/codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(promoCode)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error creating promo code: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to create promo code. Please try again.');
    }
  }

  static async updatePromoCode(id: string, promoCode: Partial<Omit<PromoCode, '_id' | 'createdAt' | 'updatedAt'>>): Promise<PromoCode> {
    if (API_DEBUG) {
      console.log(`Updating promo code: ${API_URL}/promos/codes/${id}`);
    }

    try {
      const response = await fetch(`${API_URL}/promos/codes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(promoCode)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error updating promo code: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to update promo code. Please try again.');
    }
  }

  static async deletePromoCode(id: string): Promise<void> {
    if (API_DEBUG) {
      console.log(`Deleting promo code: ${API_URL}/promos/codes/${id}`);
    }

    try {
      const response = await fetch(`${API_URL}/promos/codes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error deleting promo code: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to delete promo code. Please try again.');
    }
  }

  // Методы для работы с настройками доставки
  static async getDeliverySettings(): Promise<DeliverySettings> {
    if (API_DEBUG) {
      console.log(`Fetching delivery settings from: ${API_URL}/settings/delivery`);
    }

    try {
      const response = await fetch(`${API_URL}/settings/delivery`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching delivery settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Возвращаем значения по умолчанию в случае ошибки
      return {
        defaultCost: 300,
        freeDeliveryThreshold: 5000
      };
    }
  }

  // Вычисление стоимости доставки
  static calculateDelivery(subtotal: number, settings: DeliverySettings = {
    defaultCost: 700,
    freeDeliveryThreshold: 5000
  }): { 
    deliveryCost: number, 
    freeDelivery: boolean 
  } {
    const freeDelivery = subtotal >= settings.freeDeliveryThreshold;
    const deliveryCost = freeDelivery ? 0 : settings.defaultCost;
    
    return { deliveryCost, freeDelivery };
  }
}