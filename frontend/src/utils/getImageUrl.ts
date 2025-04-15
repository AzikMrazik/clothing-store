// Универсальный хелпер для формирования корректного URL изображения
export function getImageUrl(imageSource?: string): string {
  if (!imageSource) return '/placeholder-product.jpg';
  if (/^(https?:\/\/|\/\/)/.test(imageSource)) return imageSource;
  // Используем CDN, если задан
  const CDN_BASE = import.meta.env.VITE_CDN_URL || '';
  if (CDN_BASE && !imageSource.startsWith('http')) {
    return `${CDN_BASE.replace(/\/$/, '')}/${imageSource.replace(/^\//, '')}`;
  }
  const baseUrl = window.location.origin;
  if (imageSource.startsWith('/')) return `${baseUrl}${imageSource}`;
  return `${baseUrl}/${imageSource}`;
}
