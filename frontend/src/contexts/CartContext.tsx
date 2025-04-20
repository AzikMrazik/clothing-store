import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { useNotification } from './NotificationContext';
import { Cart, CartItem, PromoCode } from '../types/models';
import { CartStorageService } from '../services/CartStorageService';

interface CartState extends Cart {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  total: number;
  subtotal?: number;
  deliveryCost?: number;
  discount?: number;
  appliedPromoCode?: PromoCode;
  freeDelivery?: boolean;
  lastSynced?: number;
  sharingLink?: string;
  savingToServer: boolean;
}

type CartAction =
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_CART'; payload: Partial<CartState> }
  | { type: 'SET_SAVING'; payload: boolean };

const CartContext = createContext<{
  cart: CartState;
  addToCart: (product: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  updateCart: (cartData: Partial<CartState>) => void;
  shareCart: () => Promise<string | null>;
  restoreCart: (cartId: string) => Promise<void>;
}>({
  cart: { 
    items: [], 
    loading: false, 
    error: null, 
    total: 0,
    subtotal: 0,
    deliveryCost: 0,
    discount: 0,
    freeDelivery: false,
    savingToServer: false
  },
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  updateCart: () => {},
  shareCart: async () => null,
  restoreCart: async () => {},
});

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'SET_CART':
      return {
        ...state,
        items: action.payload,
        loading: false,
        total: action.payload.reduce((sum, item) => sum + item.price * item.quantity, 0),
        lastSynced: Date.now()
      };
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        item => item._id === action.payload._id
      );

      let updatedItems: CartItem[];

      if (existingItemIndex > -1) {
        updatedItems = [...state.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + action.payload.quantity,
        };
      } else {
        updatedItems = [...state.items, action.payload];
      }

      return {
        ...state,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        lastSynced: Date.now()
      };
    }
    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item._id !== action.payload);
      return {
        ...state,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        lastSynced: Date.now()
      };
    }
    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item._id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      return {
        ...state,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        lastSynced: Date.now()
      };
    }
    case 'UPDATE_CART':
      return {
        ...state,
        ...action.payload,
        lastSynced: Date.now()
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_SAVING':
      return { ...state, savingToServer: action.payload };
    default:
      return state;
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, dispatch] = useReducer(cartReducer, {
    items: [],
    loading: true, // Начинаем с загрузки
    error: null,
    total: 0,
    subtotal: 0,
    deliveryCost: 0,
    discount: 0,
    freeDelivery: false,
    savingToServer: false
  });
  const { showNotification } = useNotification();
  const [initialized, setInitialized] = useState(false);

  // Инициализируем корзину при монтировании компонента
  useEffect(() => {
    const initCart = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Используем новый метод для инициализации корзины
        const { items, metadata } = await CartStorageService.initializeCart();
        
        dispatch({ type: 'SET_CART', payload: items });
        
        if (metadata) {
          dispatch({ 
            type: 'UPDATE_CART', 
            payload: metadata 
          });
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize cart:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load cart' });
        setInitialized(true);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    initCart();
  }, []);

  // Сохраняем корзину при изменении
  useEffect(() => {
    // Пропускаем сохранение при начальной загрузке
    if (!initialized) return;
    
    const saveCartData = async () => {
      try {
        dispatch({ type: 'SET_SAVING', payload: true });
        await CartStorageService.saveCart(cart);
      } catch (error) {
        console.error('Error saving cart:', error);
      } finally {
        dispatch({ type: 'SET_SAVING', payload: false });
      }
    };
    
    // Используем debounce для предотвращения частого сохранения
    const timeoutId = setTimeout(saveCartData, 500);
    return () => clearTimeout(timeoutId);
  }, [cart.items, cart.appliedPromoCode, cart.discount, cart.deliveryCost, initialized]);

  const addToCart = async (product: CartItem) => {
    try {
      // Optimistic update
      dispatch({ type: 'ADD_ITEM', payload: product });
      showNotification('Товар добавлен в корзину', 'success');
    } catch (error) {
      // Rollback on error
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add item to cart' });
      showNotification('Не удалось добавить товар в корзину', 'error');
    }
  };

  const removeFromCart = async (id: string) => {
    try {
      // Optimistic update
      dispatch({ type: 'REMOVE_ITEM', payload: id });
      showNotification('Товар удален из корзины', 'success');
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove item from cart' });
      showNotification('Не удалось удалить товар из корзины', 'error');
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    try {
      // Optimistic update
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update quantity' });
      showNotification('Не удалось обновить количество', 'error');
    }
  };

  const updateCart = (cartData: Partial<CartState>) => {
    dispatch({ type: 'UPDATE_CART', payload: cartData });
  };

  const clearCart = () => {
    // Очищаем корзину в памяти
    dispatch({ type: 'SET_CART', payload: [] });
    
    // Очищаем данные о скидках и промокодах
    dispatch({ 
      type: 'UPDATE_CART',
      payload: {
        subtotal: 0,
        discount: 0,
        deliveryCost: 0,
        appliedPromoCode: undefined,
        freeDelivery: false
      }
    });
    
    // Очищаем корзину в хранилище
    CartStorageService.clearCartStorage();
    
    showNotification('Корзина очищена', 'success');
  };

  const shareCart = async (): Promise<string | null> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Используем новый метод для шаринга корзины
      const sharingLink = await CartStorageService.shareCart(cart);
      
      if (sharingLink) {
        dispatch({ 
          type: 'UPDATE_CART', 
          payload: { sharingLink } 
        });
        
        showNotification('Ссылка на корзину создана', 'success');
        return sharingLink;
      } else {
        throw new Error('Не удалось создать ссылку на корзину');
      }
    } catch (error) {
      console.error('Failed to share cart:', error);
      showNotification('Не удалось поделиться корзиной', 'error');
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const restoreCart = async (cartId: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Восстанавливаем корзину с сервера
      const restoredCart = await CartStorageService.restoreCartFromServer(cartId);
      
      if (restoredCart) {
        // Обновляем элементы корзины
        dispatch({ type: 'SET_CART', payload: restoredCart.items });
        
        // Обновляем метаданные (скидки, промокоды)
        if (restoredCart.metadata) {
          dispatch({ type: 'UPDATE_CART', payload: restoredCart.metadata });
        }
        
        showNotification('Корзина восстановлена', 'success');
      } else {
        throw new Error('Не удалось восстановить корзину');
      }
    } catch (error) {
      console.error('Failed to restore cart:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to restore cart' });
      showNotification('Не удалось восстановить корзину', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        updateCart,
        shareCart,
        restoreCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
