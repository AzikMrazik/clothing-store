import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Card,
  CardMedia,
  CardContent,
  Box,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { motion } from 'framer-motion';
import { Add, Remove, ShoppingCart } from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useApi } from '../hooks/useApi';
import { useNotification } from '../contexts/NotificationContext';
import ImageGallery from '../components/ImageGallery';
import { Product } from '../types/models';
import Loading from '../components/Loading';
import { API_URL } from '../config';

const ProductDetails = () => {
  const { id } = useParams();
  // Mapping of size groups to sizes
  const sizeGroupMapping: Record<string,string[]> = {
    'Взрослые': ['44','46','48','50','52','54','56','58','60','62','64'],
    'Женские': ['38','40','42','44','46','48','50','52'],
    'Детские': ['122','128','134','140','146','152','156','158'],
    'Обувь': ['34','35','36','37','38','39','40','41','42','43','44','45','46','47'],
  };
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product & { sizeGroup?: string } | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const { addToCart } = useCart();
  const { call, error } = useApi();
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchProduct();
  }, [id]);
  
  useEffect(() => {
    // Загружаем похожие товары, если у нас есть информация о текущем товаре
    if (product) {
      fetchRelatedProducts();
      // Initialize default size and color
      if (product.sizes && product.sizes.length) setSelectedSize(product.sizes[0]);
      if (product.colors && product.colors.length) setSelectedColor(product.colors[0]);
      if (product.sizeGroup) setSelectedGroup(product.sizeGroup);
    }
  }, [product]);

  const fetchProduct = async () => {
    const result = await call(
      async () => {
        const response = await fetch(`${API_URL}/products/${id}`);
        if (!response.ok) throw new Error('Product not found');
        return response.json();
      },
      { errorMessage: 'Failed to load product details' }
    );

    if (result) {
      setProduct(result);
    }
  };
  
  const fetchRelatedProducts = async () => {
    if (!product) return;
    
    // Использовать только categories (массив) вместо category
    let categoryToUse = product.categories?.[0] || '';
    
    try {
      const result = await call(
        async () => {
          const response = await fetch(`${API_URL}/products?category=${encodeURIComponent(categoryToUse)}`);
          if (!response.ok) throw new Error('Failed to fetch related products');
          return response.json();
        },
        { errorMessage: 'Failed to load related products' }
      );

      if (result && Array.isArray(result)) {
        // Исключаем текущий товар из списка похожих
        const filtered = result.filter(p => p._id !== product._id);
        // Ограничиваем количество похожих товаров до 4
        setRelatedProducts(filtered.slice(0, 4));
      }
    } catch (err) {
      console.error('Error fetching related products:', err);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart({ ...product, quantity, selectedSize, selectedColor });
      showNotification('Товар добавлен в корзину', 'success');
      navigate('/cart');
    }
  };
  
  const handleAddRelatedToCart = (relatedProduct: Product) => {
    addToCart({ ...relatedProduct, quantity: 1 });
    showNotification('Товар добавлен в корзину', 'success');
  };

  if (error) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Вернуться в каталог
        </Button>
      </Container>
    );
  }

  if (!product) {
    return <Loading />;
  }

  // Determine available groups: if categories include 'Обувь', only show shoes, else exclude shoes
  const sizeGroupOptions = product?.categories?.includes('Обувь')
    ? ['Обувь']
    : Object.keys(sizeGroupMapping).filter(group => group !== 'Обувь');

  return (
    <Container 
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      maxWidth="lg" 
      sx={{ py: 4, px: 2, overflowX: 'hidden' }}
    >
      <Card elevation={3} sx={{ 
        p: { xs: 2, md: 3 },
        position: 'relative',
        overflow: 'visible',
        borderRadius: { xs: 2, md: 2 }
      }}>
        {/* Responsive layout without Grid to avoid TS errors */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 4 } }}>
          {/* Image section */}
          <Box sx={{ flex: '1 1 50%' }}>
            <Box sx={{ 
              mb: { xs: 2, md: 0 },
              width: '100%',
              '& img': {
                maxHeight: { xs: '400px', md: '600px' },
                objectFit: 'contain',
                width: '100%'
              }
            }}>
              <ImageGallery mainImage={product.images?.[0]} additionalImages={product.images?.slice(1) || []} />
            </Box>
          </Box>
          {/* Product info section */}
          <Box sx={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Categories */}
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1,
              mb: 2
            }}>
              {product.categories?.map((category, idx) => (
                <Chip
                  key={idx}
                  label={category}
                  size="small"
                  color="primary"
                  variant="outlined"
                  onClick={() => navigate(`/?category=${category}`)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>

            {/* Product name */}
            <Typography 
              variant="h4" 
              sx={{ 
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                fontWeight: 600,
                mb: 2
              }}
            >
              {product.name}
            </Typography>

            {/* Price */}
            <Typography 
              variant="h5" 
              color="primary" 
              sx={{ 
                mb: { xs: 2, md: 3 },
                fontSize: { xs: '1.4rem', md: '1.5rem' },
                fontWeight: 'bold'
              }}
            >
              {Math.round(product.price)} ₽
            </Typography>

            {/* Description */}
            <Typography 
              variant="body1" 
              sx={{ 
                mb: { xs: 3, md: 4 },
                fontSize: { xs: '0.875rem', md: '1rem' },
                lineHeight: 1.6,
                color: 'text.secondary'
              }}
            >
              {product.description}
            </Typography>

            {/* Size group selection */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Группа размеров</InputLabel>
              <Select
                fullWidth
                value={selectedGroup}
                label="Группа размеров"
                onChange={e => { setSelectedGroup(e.target.value); setSelectedSize(''); }}
                MenuProps={{ PaperProps: { sx: { maxWidth: '100%' } } }}
              >
                {sizeGroupOptions.map(gr => (
                  <MenuItem key={gr} value={gr}>{gr}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Size options */}
            {selectedGroup && (
              <Box sx={{ mb: 2, width: '100%', maxWidth: '100%' }}>
                <Typography variant="subtitle1">Размер:</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  {sizeGroupMapping[selectedGroup].map(size => (
                    <Chip
                      key={size}
                      label={size}
                      clickable
                      color={selectedSize === size ? 'primary' : 'default'}
                      onClick={() => setSelectedSize(size)}
                    />
                  ))}
                </Box>
              </Box>
            )}
            {/* Color selector */}
            {product.colors && product.colors.length > 0 && (
              <Box sx={{ mb: 2, width: '100%', maxWidth: '100%' }}>
                <Typography variant="subtitle1">Цвет:</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  {product.colors.map(color => (
                    <Chip
                      key={color}
                      label={color}
                      clickable
                      variant={selectedColor === color ? 'filled' : 'outlined'}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Action buttons: learn size above add to cart with quantity controls */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 'auto' }}>
              {/* Узнать размер button full width */}
              <Button
                component={Link}
                to="/razmeri"
                variant="outlined"
                fullWidth
              >
                Узнать размер
              </Button>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 2 }}>
                {/* Quantity controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: { xs: 1, sm: 0 } }}>
                  <IconButton onClick={() => setQuantity(Math.max(1, quantity - 1))} size="small">
                    <Remove />
                  </IconButton>
                  <Typography sx={{ px: 2, minWidth: 40, textAlign: 'center' }}>{quantity}</Typography>
                  <IconButton onClick={() => setQuantity(quantity + 1)} size="small">
                    <Add />
                  </IconButton>
                </Box>
                {/* Add to cart button full width */}
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={handleAddToCart}
                  startIcon={<ShoppingCart />}
                  sx={{ position: 'sticky', bottom: 0, mt: 'auto' }}
                >
                  В корзину
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* Related products section */}
      {relatedProducts.length > 0 && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom>
            Похожие товары
          </Typography>
          
          <Box sx={{ 
            width: '100%', // Гарантируем полную ширину
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2
          }}>
            {relatedProducts.map((relatedProduct) => (
              <Box 
                key={relatedProduct._id} 
                sx={{ 
                  display: 'flex',
                  alignItems: 'stretch',
                  width: { xs: 'calc(50% - 8px)', sm: 'calc(50% - 16px)', md: 'calc(25% - 16px)' },
                  maxWidth: { xs: 'calc(50% - 8px)', sm: 'calc(50% - 16px)', md: 'calc(25% - 16px)' },
                  paddingLeft: '0 !important',
                  paddingTop: '0 !important',
                  marginBottom: { xs: 1, sm: 2 },
                  boxSizing: 'border-box'
                }}
              >
                <Card 
                  sx={{ 
                    width: '100%',
                    display: 'flex', 
                    flexDirection: 'column',
                    height: '100%', 
                    minHeight: { xs: 300, sm: 320, md: 340 },
                    aspectRatio: '3/4', // Устанавливаем соотношение сторон 3:4 (ширина:высота)
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      transition: 'transform 0.2s ease-in-out',
                      boxShadow: 6
                    },
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                  }}
                  onClick={() => navigate(`/product/${relatedProduct._id}`)}
                >
                  <Box 
                    sx={{ 
                      position: 'relative',
                      paddingTop: '75%', // 3:4 соотношение для контейнера изображения (75% = 3/4)
                      width: '100%',
                      overflow: 'hidden',
                      backgroundColor: 'background.paper',
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      {relatedProduct.images?.[0] ? (
                        <CardMedia
                          component="img"
                          image={relatedProduct.images?.[0] || '/placeholder-product.jpg'}
                          alt={relatedProduct.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
                          }}
                          sx={{ 
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transition: 'transform 0.3s ease',
                            '&:hover': {
                              transform: 'scale(1.05)'
                            }
                          }}
                        />
                      ) : (
                        <Box 
                          sx={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          <Typography color="text.secondary">
                            Нет фото
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <CardContent 
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      p: { xs: 1.5, sm: 2 },
                      '&:last-child': { pb: { xs: 1.5, sm: 2 } },
                      flexGrow: 1,
                    }}
                  >
                    {/* Контейнер для текстового содержимого с фиксированной высотой */}
                    <Box sx={{ flexGrow: 1, overflow: 'hidden', mb: 2 }}>
                      <Typography 
                        variant="h6" 
                        component="h2"
                        sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.2',
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          mb: 1,
                          fontWeight: 600
                        }}
                      >
                        {relatedProduct.name}
                      </Typography>
                      {/* Описание товара убрано */}
                    </Box>
                    {/* Блок с ценой и кнопкой всегда внизу карточки */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      pt: 1,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      mt: 'auto'
                    }}>
                      <Typography 
                        variant="h6" 
                        color="primary" 
                        sx={{ 
                          fontSize: { xs: '1rem', sm: '1.1rem' },
                          fontWeight: 600
                        }}
                      >
                        {Math.round(relatedProduct.price)} ₽
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddRelatedToCart(relatedProduct);
                        }}
                        sx={{ 
                          minWidth: 'auto',
                          px: { xs: 1, sm: 2 },
                          py: 0.5,
                          fontSize: { xs: '0.75rem', sm: '0.8rem' }
                        }}
                      >
                        В корзину
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default ProductDetails;
