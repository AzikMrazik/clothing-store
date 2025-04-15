import React from 'react';
import { Box, Button, Typography } from '@mui/material';

interface Product {
  id: number;
  name: string;
  price: number;
}

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onAddToCart }) => {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
      {products.map((product) => (
        <Box key={product.id} sx={{ border: '1px solid #ccc', borderRadius: 2, p: 2, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6">{product.name}</Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 'auto'
          }}>
            <Typography variant="h6" color="primary">
              ₽{product.price}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => onAddToCart(product)}
            >
              В корзину
            </Button>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default ProductGrid;