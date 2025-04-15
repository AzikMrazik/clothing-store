// filepath: c:\Programming\clothing-store\frontend\src\components\CategoryCards.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { motion } from 'framer-motion';
import { Category } from '../types/models';
import { CategoryService } from '../services/CategoryService';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import Loading from './Loading';

interface CategoryCardsProps {
  onCategoryChange?: (category: string) => void;
}

const CategoryCards: React.FC<CategoryCardsProps> = ({ onCategoryChange }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const fetchedCategories = await CategoryService.fetchCategories();
      // Сортируем категории по порядку и фильтруем только активные
      const activeCategories = fetchedCategories
        .filter(category => category.isActive)
        .sort((a, b) => a.order - b.order);
      
      setCategories(activeCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showNotification('Не удалось загрузить категории', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    if (onCategoryChange) {
      onCategoryChange(categoryId);
    } else {
      navigate(`/?category=${categoryId}`);
    }
  };

  if (loading) {
    return <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><Loading /></Box>;
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
          Категории товаров
        </Typography>
        <Grid container spacing={3} sx={{ 
          justifyContent: 'flex-start',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap'
        }}>
          {categories.map((category) => (
            <Box key={category._id} 
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              sx={{ 
                display: 'flex',
                alignItems: 'stretch',
                width: { xs: 'calc(50% - 16px)', sm: 'calc(33.33% - 16px)', md: 'calc(25% - 16px)', lg: 'calc(16.66% - 16px)' },
                maxWidth: { xs: 'calc(50% - 16px)', sm: 'calc(33.33% - 16px)', md: 'calc(25% - 16px)', lg: 'calc(16.66% - 16px)' },
                paddingLeft: '0 !important',
                paddingTop: '0 !important',
                marginBottom: { xs: 2, sm: 3 },
                boxSizing: 'border-box'
              }}
            >
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  aspectRatio: '3/4', // Устанавливаем соотношение сторон 3:4 (ширина:высота)
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6,
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                  }
                }}
                onClick={() => handleCategoryClick(category._id)}
              >
                <Box sx={{ 
                  position: 'relative',
                  paddingTop: '100%', // Квадратное соотношение сторон
                  overflow: 'hidden'
                }}>
                  {category.imageUrl && (
                    <CardMedia
                      component="img"
                      image={category.imageUrl}
                      alt={category.name}
                      sx={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    />
                  )}
                </Box>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Typography variant="h6">
                    {category.name}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default CategoryCards;