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
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
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

  const handleCategoryClick = (categorySlug: string) => {
    if (onCategoryChange) {
      onCategoryChange(categorySlug);
    } else {
      navigate(`/category/${categorySlug}`);
    }
  };

  // Custom arrow components for manual scroll
  const NextArrow = (props: any) => {
    const { className, style, onClick } = props;
    return (
      <Box
        className={className}
        sx={{ zIndex: 2, '&:hover': { color: 'primary.main' } }}
        style={style}
        onClick={onClick}
      >
        <ArrowForwardIosIcon />
      </Box>
    );
  };
  const PrevArrow = (props: any) => {
    const { className, style, onClick } = props;
    return (
      <Box
        className={className}
        sx={{ zIndex: 2, '&:hover': { color: 'primary.main' } }}
        style={style}
        onClick={onClick}
      >
        <ArrowBackIosNewIcon />
      </Box>
    );
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
    slidesToShow: Math.min(categories.length, 6),
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    arrows: true,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: Math.min(categories.length, 5) } },
      { breakpoint: 900, settings: { slidesToShow: Math.min(categories.length, 4) } },
      { breakpoint: 600, settings: { slidesToShow: 2 } },
      { breakpoint: 480, settings: { slidesToShow: 2 } }
    ]
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 1, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
          Категории товаров
        </Typography>
        {/* Horizontal scrollable slider for categories */}
        <Box sx={{ position: 'relative', '.slick-list': { overflow: 'hidden' }, '.slick-arrow': { zIndex: 3 } }}>
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
                    position: 'relative',
                    zIndex: 1,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    height: { xs: 180, sm: 220, md: 260, lg: 300 }, // увеличена высота карточки
                    minHeight: { xs: 180, sm: 220, md: 260, lg: 300 },
                    boxShadow: 1,
                    '&:hover': { zIndex: 10, transform: 'translateY(-5px)', boxShadow: 6, transition: 'transform 0.3s ease' }
                  }}
                  onClick={() => handleCategoryClick(category.slug)}
                >
                  <Box sx={{ position: 'relative', paddingTop: { xs: '90%', sm: '110%' }, overflow: 'hidden' }}>
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
      </Box>
    </Container>
  );
};

export default CategoryCards;