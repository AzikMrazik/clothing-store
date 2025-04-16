import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  List, 
  ListItem, 
  ListItemText,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Skeleton
} from '@mui/material';
import { motion } from 'framer-motion';
import { ShoppingBag, AddShoppingCart } from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { API_URL } from '../config';

const SharedCart = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { showNotification } = useNotification();
  const [imageLoadingStatus, setImageLoadingStatus] = useState<Record<string, boolean>>({});

  // Обрабатываем ошибки загрузки изображений
  const handleImageError = (itemId: string) => (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = '/placeholder-product.jpg'; // Путь к запасному изображению
    setImageLoadingStatus(prev => ({ ...prev, [itemId]: true }));
  };

  const handleImageLoad = (itemId: string) => () => {
    setImageLoadingStatus(prev => ({ ...prev, [itemId]: true }));
  };

  // Получаем корректный URL изображения
  const getImageUrl = (item: any): string => {
    let url = '';
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      url = item.images[0];
    } else if (item.imageUrl) {
      url = item.imageUrl;
    } else if (item.image) {
      url = item.image;
    } else if (item.img) {
      url = item.img;
    }
    // Если url абсолютный, возвращаем как есть
    if (url && /^(https?:\/\/|\/\/)/.test(url)) return url;
    // Если url начинается с /, добавляем window.location.origin
    if (url && url.startsWith('/')) return window.location.origin + url;
    // Если url не пустой, добавляем / перед ним
    if (url) return window.location.origin + '/' + url.replace(/^\/+/, '');
    return window.location.origin + '/placeholder-product.jpg';
  };

  useEffect(() => {
    fetch(`${API_URL}/cart/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Корзина не найдена');
        return res.json();
      })
      .then(data => {
        if (data && data.items) {
          data.items.forEach((item: any) => {
            // Приводим к images[] если есть image или imageUrl
            if (!item.images || !Array.isArray(item.images) || item.images.length === 0) {
              if (item.image) item.images = [item.image];
              else if (item.imageUrl) item.images = [item.imageUrl];
            }
            item.processedImageUrl = getImageUrl(item);
          });
        }
        setCart(data);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddAllToCart = () => {
    cart.items.forEach((item: any) => {
      // Убедимся, что у товара есть все необходимые поля
      const productToAdd = {
        ...item,
        _id: item._id || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        imageUrl: item.processedImageUrl || item.imageUrl || '/placeholder-product.jpg',
        quantity: item.quantity
      };
      addToCart(productToAdd);
    });
    showNotification('Товары добавлены в корзину', 'success');
    navigate('/cart');
  };

  const handleAddSingleToCart = (item: any) => {
    const productToAdd = {
      ...item,
      _id: item._id || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      imageUrl: item.processedImageUrl || item.imageUrl || '/placeholder-product.jpg',
      quantity: item.quantity
    };
    addToCart(productToAdd);
    showNotification(`Товар "${item.name}" добавлен в корзину`, 'success');
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Загружаем корзину...
        </Typography>
      </Container>
    );
  }

  if (error || !cart) {
    return (
      <Container sx={{ textAlign: 'center', py: 8 }}>
        <ShoppingBag sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" color="text.secondary" gutterBottom>
          {error || 'Корзина не найдена'}
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

  if (!cart.items || !cart.items.length) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Эта корзина пуста или товары в ней более недоступны
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/')}
        >
          Перейти в каталог
        </Button>
      </Container>
    );
  }

  const total = cart.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

  return (
    <Container
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      maxWidth="md"
      sx={{ py: 4 }}
    >
      <Typography variant="h4" gutterBottom>
        Шеринговая корзина
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <List>
          {cart.items.map((item: any, index: number) => (
            <React.Fragment key={`${item._id || index}`}>
              {index > 0 && <Divider />}
              <ListItem 
                sx={{ py: 2 }}
                secondaryAction={
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddShoppingCart />}
                    onClick={() => handleAddSingleToCart(item)}
                  >
                    В корзину
                  </Button>
                }
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Box sx={{ position: 'relative', width: 80, height: 80, mr: 2 }}>
                    {!imageLoadingStatus[item._id || index] && (
                      <Skeleton variant="rectangular" width={80} height={80} />
                    )}
                    <Box
                      component="img"
                      src={item.images && item.images.length > 0 ? item.images[0] : (item.processedImageUrl || '/placeholder-product.jpg')}
                      alt={item.name}
                      onError={handleImageError(item._id || index)}
                      onLoad={handleImageLoad(item._id || index)}
                      sx={{
                        width: 80,
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 1,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        opacity: imageLoadingStatus[item._id || index] ? 1 : 0,
                        transition: 'opacity 0.3s'
                      }}
                    />
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" noWrap>
                          {item.name}
                        </Typography>
                      }
                      secondary={`${item.quantity} шт. × ${Math.round(item.price)} ₽`}
                    />
                    <Typography variant="subtitle1" fontWeight="bold">
                      {Math.round(item.price * item.quantity)} ₽
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            </React.Fragment>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3 
        }}>
          <Typography variant="h6">
            Итого
          </Typography>
          <Typography variant="h6" color="primary">
            {Math.round(total)} ₽
          </Typography>
        </Box>

        <Button
          variant="contained"
          fullWidth
          startIcon={<AddShoppingCart />}
          onClick={handleAddAllToCart}
          size="large"
        >
          Добавить все товары в корзину
        </Button>
      </Paper>
    </Container>
  );
};

export default SharedCart;
