import { API_URL, API_DEBUG } from '../config';
import { Category } from '../types/models';

export class CategoryService {
  static async fetchCategories(): Promise<Category[]> {
    if (API_DEBUG) {
      console.log(`Fetching categories from: ${API_URL}/categories`);
    }

    try {
      const response = await fetch(`${API_URL}/categories`, {
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
        console.log(`Received ${data.length} categories from API`);
      }
      return data;
    } catch (error) {
      console.error(`Error fetching categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to load categories. Please check your connection and try again.');
    }
  }

  static async updateCategoryOrder(categories: Pick<Category, '_id' | 'order'>[]): Promise<Category[]> {
    if (API_DEBUG) {
      console.log(`Updating category order: ${API_URL}/categories/order`);
    }

    try {
      const response = await fetch(`${API_URL}/categories/order`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ categories })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error updating category order: ${error.message}`);
      } else {
        console.error('Error updating category order:', error);
      }
      throw new Error('Failed to update category order. Please try again.');
    }
  }

  static async createCategory(category: Omit<Category, '_id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    if (API_DEBUG) {
      console.log(`Creating new category: ${API_URL}/categories`);
    }

    try {
      const response = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(category)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error creating category: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to create category. Please try again.');
    }
  }

  static async updateCategory(id: string, category: Partial<Omit<Category, '_id' | 'createdAt' | 'updatedAt'>>): Promise<Category> {
    if (API_DEBUG) {
      console.log(`Updating category: ${API_URL}/categories/${id}`);
    }

    try {
      const response = await fetch(`${API_URL}/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(category)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error updating category: ${error.message}`);
      } else {
        console.error('Error updating category:', error);
      }
      throw new Error('Failed to update category. Please try again.');
    }
  }

  static async deleteCategory(id: string): Promise<void> {
    if (API_DEBUG) {
      console.log(`Deleting category: ${API_URL}/categories/${id}`);
    }

    try {
      const response = await fetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error deleting category: ${error.message}`);
      } else {
        console.error('Error deleting category:', error);
      }
      throw new Error('Failed to delete category. Please try again.');
    }
  }
}