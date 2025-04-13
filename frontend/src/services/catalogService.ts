import { API_BASE_URL } from '../utils/config';

export const fetchCatalog = async () => {
  const response = await fetch(`${API_BASE_URL}/api/catalog`);
  const data = await response.json();
  return data;
};

export const sharableProductLink = (productId: string) => {
  return `${API_BASE_URL}/product/${productId}`;
};
