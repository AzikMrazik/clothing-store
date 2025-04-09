import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Button,
  Card,
  Box,
  Chip,
  Divider
} from '@mui/material';
import { motion } from 'framer-motion';
import { Add, Remove, ShoppingCart } from '@mui/icons-material';
import { useCart } from '../contexts/CartContext';
import { useApi } from '../hooks/useApi';
import { useNotification } from '../contexts/NotificationContext';
import ImageGallery from '../components/ImageGallery';
import { Product } from '../types/models';
import Loading from '../components/Loading';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { call, error } = useApi();
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    const result = await call(
      async () => {
        const response = await fetch(`http://localhost:3001/api/products/${id}`);
        if (!response.ok) throw new Error('Product not found');
        return response.json();
      },
      { errorMessage: 'Failed to load product details' }
    );

    if (result) {
      setProduct(result);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart({ ...product, quantity });
      showNotification('Товар добавлен в корзину', 'success');
      navigate('/cart');
    }
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

  return (
    <Container 
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      maxWidth="lg" 
      sx={{ py: 4 }}
    >
      <Card elevation={3} sx={{ p: 3 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <ImageGallery
              mainImage={product.imageUrl}
              images={product.images || []}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h4" gutterBottom>
              {product.name}
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Chip
                label={product.category}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>

            <Typography 
              variant="h5" 
              color="primary" 
              sx={{ mb: 3, fontWeight: 'bold' }}
            >
              {Math.round(product.price)} ₽
            </Typography>

            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ mb: 4 }}
              paragraph
            >
              {product.description}
            </Typography>

            {product.characteristics && product.characteristics.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Характеристики
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {product.characteristics.map((char, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      mb: 1 
                    }}
                  >
                    <Typography color="text.secondary">
                      {char.name}
                    </Typography>
                    <Typography fontWeight="medium">
                      {char.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              mb: 4 
            }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Remove />
              </Button>
              <Typography sx={{ minWidth: 40, textAlign: 'center' }}>
                {quantity}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Add />
              </Button>
            </Box>

            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              startIcon={<ShoppingCart />}
              onClick={handleAddToCart}
            >
              Добавить в корзину
            </Button>

            {product.videoUrl && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Видео о товаре
                </Typography>
                <Box
                  component="iframe"
                  src={product.videoUrl}
                  sx={{
                    width: '100%',
                    height: '300px',
                    border: 'none',
                    borderRadius: 1
                  }}
                  allowFullScreen
                />
              </Box>
            )}
          </Grid>
        </Grid>
      </Card>
    </Container>
  );
};

export default ProductDetails;
