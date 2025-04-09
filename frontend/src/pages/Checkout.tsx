import { useEffect } from 'react';
import { Container, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CheckoutForm from '../components/CheckoutForm';
import { useCart } from '../contexts/CartContext';

const Checkout = () => {
  const { cart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!cart.items.length) {
      navigate('/cart');
    }
  }, [cart.items.length, navigate]);

  if (!cart.items.length) {
    return null;
  }

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
        Оформление заказа
      </Typography>
      
      <Box sx={{ mt: 3 }}>
        <CheckoutForm />
      </Box>
    </Container>
  );
};

export default Checkout;