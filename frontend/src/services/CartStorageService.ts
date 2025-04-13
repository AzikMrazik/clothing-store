import { Cart, CartItem } from '../types/models';
import { API_URL, API_DEBUG } from '../config';

export class CartStorageService {
  private static readonly CART_STORAGE_KEY = 'shop_cart';
  private static readonly CART_METADATA_KEY = 'shop_cart_metadata';
  private static readonly CART_SERVER_ID_KEY = 'shop_cart_server_id';
  
  /**
   * Сохраняет корзину в локальное хранилище и на сервер
   */
  static async saveCart(cart: Cart): Promise<string | null> {
    try {
      // Сохраняем в localStorage
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cart.items));
      
      // Сохраняем метаданные корзины (промокод, скидка, и т.д.)
      if (cart.appliedPromoCode || cart.discount !== undefined || cart.deliveryCost !== undefined) {
        const cartMetadata = {
          appliedPromoCode: cart.appliedPromoCode,
          discount: cart.discount,
          deliveryCost: cart.deliveryCost,
          freeDelivery: cart.freeDelivery,
          subtotal: cart.subtotal
        };
        localStorage.setItem(this.CART_METADATA_KEY, JSON.stringify(cartMetadata));
      }
      
      // Если корзина не пуста, сохраняем ее на сервере
      if (cart.items.length > 0) {
        const savedCartId = await this.saveCartToServer(cart);
        if (savedCartId) {
          localStorage.setItem(this.CART_SERVER_ID_KEY, savedCartId);
          return savedCartId;
        }
      } else {
        // Если корзина пуста, удаляем её ID из хранилища
        localStorage.removeItem(this.CART_SERVER_ID_KEY);
      }
      
      return null;
    } catch (error) {
      console.error('Error saving cart:', error);
      return null;
    }
  }
  
  /**
   * Загружает корзину из локального хранилища
   */
  static loadCartFromStorage(): { items: CartItem[], metadata: Partial<Cart> } {
    let items: CartItem[] = [];
    let metadata: Partial<Cart> = {};
    
    try {
      // Загружаем товары корзины
      const storedCart = localStorage.getItem(this.CART_STORAGE_KEY);
      if (storedCart) {
        items = JSON.parse(storedCart);
      }
      
      // Загружаем метаданные корзины
      const storedMetadata = localStorage.getItem(this.CART_METADATA_KEY);
      if (storedMetadata) {
        metadata = JSON.parse(storedMetadata);
      }
      
    } catch (error) {
      console.error('Error loading cart from storage:', error);
    }
    
    return { items, metadata };
  }
  
  /**
   * Получает идентификатор сохраненной на сервере корзины
   */
  static getServerCartId(): string | null {
    return localStorage.getItem(this.CART_SERVER_ID_KEY);
  }
  
  /**
   * Сохраняет корзину на сервере для возможности восстановления в будущем
   */
  static async saveCartToServer(cart: Cart): Promise<string | null> {
    try {
      if (API_DEBUG) {
        console.log('Saving cart to server');
      }
      
      // Получаем существующий ID корзины, если есть
      const cartId = this.getServerCartId();
      
      const method = cartId ? 'PUT' : 'POST';
      const url = cartId 
        ? `${API_URL}/cart/${cartId}` 
        : `${API_URL}/cart`;
      
      // Получаем CSRF токен из cookie если он доступен
      const csrfToken = this.getCsrfToken();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Добавляем CSRF токен в заголовки если он доступен
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
      
      const response = await fetch(url, {
        method,
        credentials: 'include', // Важно для передачи cookies при кросс-доменных запросах
        headers,
        body: JSON.stringify({
          items: cart.items,
          metadata: {
            appliedPromoCode: cart.appliedPromoCode,
            discount: cart.discount,
            deliveryCost: cart.deliveryCost,
            freeDelivery: cart.freeDelivery,
            subtotal: cart.subtotal
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save cart: ${response.status}`);
      }
      
      const data = await response.json();
      return data.cartId || data.id || null;
    } catch (error) {
      console.error('Error saving cart to server:', error);
      return null;
    }
  }
  
  /**
   * Получает CSRF токен из куки
   */
  private static getCsrfToken(): string | null {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => 
      cookie.trim().startsWith('XSRF-TOKEN=') || 
      cookie.trim().startsWith('_csrf=')
    );
    
    if (csrfCookie) {
      return csrfCookie.split('=')[1];
    }
    
    return null;
  }
  
  /**
   * Восстанавливает корзину с сервера по идентификатору
   */
  static async restoreCartFromServer(cartId: string): Promise<{ items: CartItem[], metadata: Partial<Cart> } | null> {
    try {
      if (API_DEBUG) {
        console.log(`Restoring cart from server, ID: ${cartId}`);
      }
      
      const response = await fetch(`${API_URL}/cart/${cartId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to restore cart: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.items) {
        throw new Error('Invalid cart data received from server');
      }
      
      // Обрабатываем проблему с изображениями товаров
      data.items.forEach((item: any) => {
        // Заменяем относительные пути на абсолютные, если это необходимо
        if (item.imageUrl && !item.imageUrl.startsWith('http')) {
          if (item.imageUrl.startsWith('/')) {
            item.imageUrl = `${API_URL}${item.imageUrl}`;
          } else {
            item.imageUrl = `${API_URL}/${item.imageUrl}`;
          }
        }
      });
      
      return {
        items: data.items,
        metadata: data.metadata || {}
      };
    } catch (error) {
      console.error('Error restoring cart from server:', error);
      
      // В случае ошибки возвращаем null (так как шаринговая корзина могла быть удалена)
      // но не удаляем данные из локального хранилища
      return null;
    }
  }
  
  /**
   * Генерирует ссылку для шаринга корзины
   */
  static generateSharingLink(cartId: string): string {
    return `${window.location.origin}/shared-cart/${cartId}`;
  }
  
  /**
   * Удаляет все данные корзины из локального хранилища
   */
  static clearCartStorage(): void {
    localStorage.removeItem(this.CART_STORAGE_KEY);
    localStorage.removeItem(this.CART_METADATA_KEY);
    localStorage.removeItem(this.CART_SERVER_ID_KEY);
  }
  
  /**
   * Инициализирует корзину с проверкой наличия сохраненной на сервере
   */
  static async initializeCart(): Promise<{ items: CartItem[], metadata: Partial<Cart> }> {
    // Сначала пытаемся загрузить локальную корзину
    const localCart = this.loadCartFromStorage();
    
    // Если есть ID серверной корзины, проверяем её и сравниваем с локальной
    const serverCartId = this.getServerCartId();
    
    if (serverCartId) {
      try {
        const serverCart = await this.restoreCartFromServer(serverCartId);
        
        // Если серверная корзина найдена и её состав новее локальной
        if (serverCart) {
          // Сравниваем по количеству товаров и времени последнего обновления
          const isServerCartNewer = 
            serverCart.items.length > localCart.items.length || 
            serverCart.metadata.lastUpdated > (localCart.metadata.lastUpdated || 0);
          
          if (isServerCartNewer) {
            return serverCart;
          }
        }
      } catch (error) {
        console.error('Error initializing cart from server:', error);
      }
    }
    
    return localCart;
  }
  
  /**
   * Добавляет функцию поделиться корзиной
   */
  static async shareCart(cart: Cart): Promise<string | null> {
    // Сохраняем корзину на сервере и получаем идентификатор для шаринга
    const cartId = await this.saveCartToServer(cart);
    
    if (!cartId) {
      return null;
    }
    
    // Генерируем ссылку для шаринга
    return this.generateSharingLink(cartId);
  }
}