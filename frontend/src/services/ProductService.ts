import { API_URL, API_DEBUG } from '../config';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class ProductService {
  static async fetchProducts(retry = 0): Promise<any[]> {
    const url = `${API_URL}/products`;
    if (API_DEBUG) {
      console.log(`Fetching products from: ${url}, retry attempt: ${retry}`);
    }

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const data = await response.json();
      if (API_DEBUG) {
        console.log(`Received ${data.length} products from API`);
      }
      return data;
    } catch (error) {
      console.error(`Error fetching products: ${error.message}`);
      
      if (retry < MAX_RETRIES) {
        if (API_DEBUG) {
          console.log(`Retrying in ${RETRY_DELAY}ms... (${retry + 1}/${MAX_RETRIES})`);
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.fetchProducts(retry + 1);
      }
      throw new Error('Failed to load products. Please check your connection and try again.');
    }
  }
}
