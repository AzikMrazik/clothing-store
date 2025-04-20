// filepath: c:\Programming\clothing-store\frontend\src\components\CategoryCards.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Container
} from '@mui/material';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
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

  // Slider settings for horizontal scrolling categories
  const settings = {
    infinite: categories.length > 1,
    speed: 600,
    slidesToShow: Math.min(categories.length, 4),
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    arrows: true,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: Math.min(categories.length, 3) } },
      { breakpoint: 900, settings: { slidesToShow: Math.min(categories.length, 2) } },
      { breakpoint: 600, settings: { slidesToShow: 1 } }
    ]
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
          Категории товаров
        </Typography>
        {/* Horizontal scrollable slider for categories */}
        <Slider {...settings}>
          {categories.map((category) => (
            <Box key={category._id}
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              sx={{ px: 1 }}
            >
              <Card
                sx={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  aspectRatio: '3/4',
                  '&:hover': { transform: 'translateY(-5px)', boxShadow: 6, transition: 'transform 0.3s ease' }
                }}
                onClick={() => handleCategoryClick(category._id)}
              >
                <Box sx={{ position: 'relative', paddingTop: '100%', overflow: 'hidden' }}>
                  {category.imageUrl && (
                    <CardMedia
                      component="img"
                      image={category.imageUrl}
                      alt={category.name}
                      sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </Box>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Typography variant="h6">{category.name}</Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Slider>
      </Box>
    </Container>
  );
};

export default CategoryCards;