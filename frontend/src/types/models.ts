export interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: string;
  characteristics?: Array<{
    name: string;
    value: string;
  }>;
  images?: string[];
  videoUrl?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
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