import { IMAGE_BASE_URL } from './config';

export const getFullImageUrl = (imagePath: string) => {
  if (imagePath.startsWith('http')) return imagePath;
  return `${IMAGE_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

export const prepareProductForSharing = (product: any) => {
  return {
    ...product,
    image: getFullImageUrl(product.image)
  };
};
