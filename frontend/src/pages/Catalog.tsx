import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useApi } from '../hooks/useApi';
import { useNotification } from '../contexts/NotificationContext';
import FilterPanel from '../components/FilterPanel';
import Loading from '../components/Loading';
import { Product } from '../types/models';

type SortOption = 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';

const Catalog = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { call } = useApi();
  const { showNotification } = useNotification();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    return uniqueCategories.sort();
  }, [products]);

  const maxPrice = useMemo(() => {
    return Math.max(...products.map(p => p.price), 1000);
  }, [products]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const result = await call(
      async () => {
        const response = await fetch('http://localhost:3001/api/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        return response.json();
      },
      { errorMessage: 'Failed to load products' }
    );

    if (result) {
      setProducts(result);
      setPriceRange([0, Math.max(...result.map((p: Product) => p.price))]);
    }
    setLoading(false);
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter(product => 
        (!searchQuery || 
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase())
        ) &&
        (!selectedCategory || product.category === selectedCategory) &&
        product.price >= priceRange[0] &&
        product.price <= priceRange[1]
      )
      .sort((a, b) => {
        switch (sortBy) {
          case 'price_asc':
            return a.price - b.price;
          case 'price_desc':
            return b.price - a.price;
          case 'name_asc':
            return a.name.localeCompare(b.name);
          case 'name_desc':
            return b.name.localeCompare(a.name);
          default:
            return 0;
        }
      });
  }, [products, searchQuery, selectedCategory, priceRange, sortBy]);

  const handleAddToCart = (product: Product) => {
    addToCart({ ...product, quantity: 1 });
    showNotification('Товар добавлен в корзину', 'success');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setPriceRange([0, maxPrice]);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Каталог товаров
      </Typography>

      <FilterPanel
        categories={categories}
        selectedCategory={selectedCategory}
        priceRange={priceRange}
        maxPrice={maxPrice}
        searchQuery={searchQuery}
        onCategoryChange={setSelectedCategory}
        onPriceChange={setPriceRange}
        onSearchChange={setSearchQuery}
        onClear={clearFilters}
      />

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Typography>
          Найдено товаров: {filteredProducts.length}
        </Typography>

        <FormControl size="small" sx={{ width: 200 }}>
          <InputLabel>Сортировать</InputLabel>
          <Select
            value={sortBy}
            label="Сортировать"
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <MenuItem value="price_asc">По цене ↑</MenuItem>
            <MenuItem value="price_desc">По цене ↓</MenuItem>
            <MenuItem value="name_asc">По названию А-Я</MenuItem>
            <MenuItem value="name_desc">По названию Я-А</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        <AnimatePresence>
          {filteredProducts.map((product) => (
            <Grid key={product._id} item xs={12} sm={6} md={4} lg={3} component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    transition: 'transform 0.2s ease-in-out'
                  }
                }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={product.imageUrl}
                  alt={product.name}
                  sx={{ 
                    cursor: 'pointer',
                    objectFit: 'cover'
                  }}
                  onClick={() => navigate(`/product/${product._id}`)}
                />
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography 
                    gutterBottom 
                    variant="h6" 
                    component="h2"
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { color: 'primary.main' }
                    }}
                    onClick={() => navigate(`/product/${product._id}`)}
                  >
                    {product.name}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ mb: 2, flexGrow: 1 }}
                  >
                    {product.description.slice(0, 100)}...
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 'auto'
                  }}>
                    <Typography variant="h6" color="primary">
                      {Math.round(product.price)} ₽
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleAddToCart(product)}
                    >
                      В корзину
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </AnimatePresence>
      </Grid>

      {filteredProducts.length === 0 && (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 8
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            По вашему запросу ничего не найдено
          </Typography>
          <Button 
            variant="contained" 
            onClick={clearFilters}
          >
            Сбросить фильтры
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default Catalog;
