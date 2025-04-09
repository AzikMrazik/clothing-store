import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useNotification } from './NotificationContext';
import { Cart, CartItem, Product } from '../types/models';

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
}

type CartAction =
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

const CartContext = createContext<{
  cart: CartState;
  addToCart: (product: Product & { quantity: number }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}>({
  cart: { items: [], loading: false, error: null },
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
});

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'SET_CART':
      return {
        ...state,
        items: action.payload,
        loading: false,
      };
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        item => item._id === action.payload._id
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...state.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + action.payload.quantity,
        };
        return { ...state, items: updatedItems };
      }

      return {
        ...state,
        items: [...state.items, action.payload],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item._id !== action.payload),
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item._id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, dispatch] = useReducer(cartReducer, {
    items: [],
    loading: false,
    error: null,
  });
  const { showNotification } = useNotification();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        dispatch({ type: 'SET_CART', payload: parsedCart });
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart.items));
  }, [cart.items]);

  const addToCart = async (product: Product & { quantity: number }) => {
    try {
      // Optimistic update
      dispatch({ type: 'ADD_ITEM', payload: product });

      // Here you could add API call to sync with backend if needed
      // const response = await fetch('api/cart', { method: 'POST', body: JSON.stringify(product) });
      // if (!response.ok) throw new Error('Failed to add item to cart');

      showNotification('Товар добавлен в корзину', 'success');
    } catch (error) {
      // Rollback on error
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add item to cart' });
      showNotification('Не удалось добавить товар в корзину', 'error');
    }
  };

  const removeFromCart = async (id: string) => {
    try {
      // Store item for potential rollback
      const removedItem = cart.items.find(item => item._id === id);
      
      // Optimistic update
      dispatch({ type: 'REMOVE_ITEM', payload: id });

      // Here you could add API call to sync with backend if needed
      // const response = await fetch(`api/cart/${id}`, { method: 'DELETE' });
      // if (!response.ok) throw new Error('Failed to remove item from cart');

      showNotification('Товар удален из корзины', 'success');
    } catch (error) {
      // Rollback on error
      if (removedItem) {
        dispatch({ type: 'ADD_ITEM', payload: removedItem });
      }
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove item from cart' });
      showNotification('Не удалось удалить товар из корзины', 'error');
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    try {
      // Store old quantity for potential rollback
      const oldItem = cart.items.find(item => item._id === id);
      
      // Optimistic update
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });

      // Here you could add API call to sync with backend if needed
      // const response = await fetch(`api/cart/${id}`, { 
      //   method: 'PATCH',
      //   body: JSON.stringify({ quantity })
      // });
      // if (!response.ok) throw new Error('Failed to update quantity');

    } catch (error) {
      // Rollback on error
      if (oldItem) {
        dispatch({ 
          type: 'UPDATE_QUANTITY', 
          payload: { id, quantity: oldItem.quantity } 
        });
      }
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update quantity' });
      showNotification('Не удалось обновить количество', 'error');
    }
  };

  const clearCart = () => {
    dispatch({ type: 'SET_CART', payload: [] });
    localStorage.removeItem('cart');
    showNotification('Корзина очищена', 'success');
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
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
