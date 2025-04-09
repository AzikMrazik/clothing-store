import React, { useEffect, useState } from 'react';
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
  CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import { ShoppingBag } from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';

const SharedCart = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { showNotification } = useNotification();

  useEffect(() => {
    fetch(`http://localhost:3001/api/cart/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Корзина не найдена');
        return res.json();
      })
      .then(data => {
        setCart(data);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddAllToCart = () => {
    cart.items.forEach((item: any) => {
      addToCart({ ...item, quantity: item.quantity });
    });
    showNotification('Товары добавлены в корзину', 'success');
    navigate('/cart');
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress />
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
        Поделенная корзина
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <List>
          {cart.items.map((item: any, index: number) => (
            <React.Fragment key={index}>
              {index > 0 && <Divider />}
              <ListItem sx={{ py: 2 }}>
                <Box
                  component="img"
                  src={item.imageUrl || item.image}
                  alt={item.name}
                  sx={{
                    width: 80,
                    height: 80,
                    objectFit: 'cover',
                    borderRadius: 1,
                    mr: 2
                  }}
                />
                <ListItemText
                  primary={item.name}
                  secondary={`${item.quantity} шт. × ${Math.round(item.price)} ₽`}
                />
                <Typography variant="subtitle1">
                  {Math.round(item.price * item.quantity)} ₽
                </Typography>
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
          onClick={handleAddAllToCart}
        >
          Добавить все товары в корзину
        </Button>
      </Paper>
    </Container>
  );
};

export default SharedCart;
