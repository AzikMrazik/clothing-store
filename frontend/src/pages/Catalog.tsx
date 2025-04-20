import { useState, useEffect, useMemo } from 'react';
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
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  TextField,
  Chip
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useApi } from '../hooks/useApi';
import { useNotification } from '../contexts/NotificationContext';
import Loading from '../components/Loading';
import { Product } from '../types/models';
import { API_URL } from '../config';
import PromoCarousel from '../components/PromoCarousel';
import CategoryCards from '../components/CategoryCards';
import { CategoryService } from '../services/CategoryService';

type SortOption = 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';

// Функция для получения параметров URL
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Catalog = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { call } = useApi();
  const { showNotification } = useNotification();
  const query = useQuery();
  const categoryFromUrl = query.get('category');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl || '');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.flatMap(p => p.categories || []))];
    return uniqueCategories.sort();
  }, [products]);

  const maxPrice = useMemo(() => {
    return Math.max(...products.map(p => p.price), 1000);
  }, [products]);

  // Обновляем URL при изменении категории
  useEffect(() => {
    const url = new URL(window.location.href);
    
    if (selectedCategory) {
      url.searchParams.set('category', selectedCategory);
    } else {
      url.searchParams.delete('category');
    }
    
    window.history.replaceState({}, '', url.toString());
  }, [selectedCategory]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchCategories = async () => {
    try {
      const categories = await CategoryService.fetchCategories();
      const map: Record<string, string> = {};
      categories.forEach(category => {
        map[category._id] = category.name;
      });
      setCategoryMap(map);
    } catch (error) {
      console.error('Error fetching categories for mapping:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const result = await call(
        async () => {
          const response = await fetch(`${API_URL}/products`);
          if (!response.ok) {
            throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
          }
          const text = await response.text();
          if (!text) {
            throw new Error('Server returned empty response');
          }
          try {
            const data = JSON.parse(text);
            return data;
          } catch (jsonError) {
            console.error('JSON parse error:', jsonError, 'Raw response:', text);
            throw new Error('Invalid JSON in server response');
          }
        },
        { errorMessage: 'Failed to load products' }
      );

      if (result) {
        if (Array.isArray(result)) {
          setProducts(result);
          setPriceRange([0, Math.max(...result.map((p: Product) => p.price || 0), 1000)]);
        } else {
          console.error('Expected array of products, got:', result);
          showNotification('Неверный формат данных с сервера', 'error');
        }
      }
    } catch (err) {
      console.error('Error in fetchProducts:', err);
      showNotification('Ошибка загрузки товаров', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Удаляем все проверки product.category, используем только product.categories (массив)
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        // filter by search query
        const searchMatch = !searchQuery ||
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase());
        // filter by category or categories
        const categoryMatch = selectedCategories.length > 0
          ? (product.categories || []).some(c => selectedCategories.includes(c))
          : (!selectedCategory || (product.categories || []).includes(selectedCategory));
        // filter by price range
        const priceMatch = product.price >= priceRange[0] && product.price <= priceRange[1];
        return searchMatch && categoryMatch && priceMatch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price_asc': return a.price - b.price;
          case 'price_desc': return b.price - a.price;
          case 'name_asc': return a.name.localeCompare(b.name);
          case 'name_desc': return b.name.localeCompare(a.name);
          default: return 0;
        }
      });
  }, [products, searchQuery, selectedCategory, selectedCategories, priceRange, sortBy, categoryMap]);

  const handleAddToCart = (product: Product) => {
    addToCart({ ...product, quantity: 1 });
    showNotification('Товар добавлен в корзину', 'success');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setPriceRange([0, maxPrice]);
    setSelectedCategories([]);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <PromoCarousel />
      
      {/* Отображаем карточки категорий только когда не выбрана ни одна категория */}
      {!selectedCategory && <CategoryCards onCategoryChange={setSelectedCategory} />}
      
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {/* Filter and sort section */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
          mb: 4
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Категории</InputLabel>
              <Select
                multiple
                value={selectedCategories}
                onChange={(e) => setSelectedCategories(e.target.value as string[])}
                input={<OutlinedInput label="Категории" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    <Checkbox checked={selectedCategories.indexOf(category) > -1} />
                    <ListItemText primary={category} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Мин. цена"
                type="number"
                value={priceRange[0]}
                onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                size="small"
                fullWidth
              />
              <TextField
                label="Макс. цена"
                type="number"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                size="small"
                fullWidth
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography>
              Найдено: {filteredProducts.length}
            </Typography>

            <FormControl size="small" sx={{ minWidth: 200 }}>
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

            {(selectedCategories.length > 0 || priceRange[0] > 0 || priceRange[1] < maxPrice) && (
              <Button 
                variant="outlined" 
                onClick={clearFilters}
                size="small"
              >
                Сбросить фильтры
              </Button>
            )}
          </Box>
        </Box>

        <Grid container spacing={{ xs: 1, sm: 2, md: 3 }} sx={{ 
          justifyContent: 'flex-start',
          maxWidth: '100%',
          margin: '0 auto',
          width: '100%', // Гарантируем полную ширину
          display: 'flex',
          flexWrap: 'wrap'
        }}>
          {filteredProducts.map((product) => (
            <Box 
              key={product._id} 
              sx={{ 
                display: 'flex',
                alignItems: 'stretch',
                width: { xs: 'calc(50% - 8px)', sm: 'calc(50% - 16px)', md: 'calc(33.33% - 16px)', lg: 'calc(25% - 16px)', xl: 'calc(16.66% - 16px)' },
                maxWidth: { xs: 'calc(50% - 8px)', sm: 'calc(50% - 16px)', md: 'calc(33.33% - 16px)', lg: 'calc(25% - 16px)', xl: 'calc(16.66% - 16px)' },
                paddingLeft: '0 !important',
                paddingTop: '0 !important',
                marginBottom: { xs: 1, sm: 2, md: 3 },
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
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    transition: 'transform 0.2s ease-in-out',
                    boxShadow: 6
                  },
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                }}
              >
                <Box 
                  sx={{ 
                    position: 'relative',
                    paddingTop: { xs: '70%', sm: '80%' }, // сбалансированное пространство под изображение: 70% на моб и 80% на пк
                    width: '100%',
                    overflow: 'hidden',
                    flexShrink: 0, // Предотвращает сжатие секции с изображением
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
                    {product.images?.[0] ? (
                      <CardMedia
                        component="img"
                        image={product.images?.[0] || '/placeholder-product.jpg'}
                        alt={product.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
                        }}
                        sx={{ 
                          cursor: 'pointer',
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.05)'
                          }
                        }}
                        onClick={() => navigate(`/product/${product._id}`)}
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
                        onClick={() => navigate(`/product/${product._id}`)}
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
                        cursor: 'pointer',
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
                      onClick={() => navigate(`/product/${product._id}`)}
                    >
                      {product.name}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.3',
                        fontSize: { xs: '0.75rem', sm: '0.8rem' }
                      }}
                    >
                      {product.description || 'Нет описания'}
                    </Typography>
                  </Box>
                  
                  {/* Блок с ценой и кнопкой всегда внизу карточки */}
                  <Box sx={{
                    pt: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    mt: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}>
                    <Typography
                      variant="h6"
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    >
                      {Math.round(product.price)} ₽
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}
                    >
                      В корзину
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
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
    </>
  );
};

export default Catalog;