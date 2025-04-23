import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper,
  Container
} from '@mui/material';
// import { useNavigate } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { PromoOffer } from '../types/models';
import { PromoService } from '../services/PromoService';
import { useNotification } from '../contexts/NotificationContext';
import Loading from './Loading';

interface PromoCarouselProps {
  autoplay?: boolean;
  autoplaySpeed?: number;
  showArrows?: boolean;
}

// Компоненты для пользовательских стрелок навигации
const NextArrow = (props: any) => {
  const { className, onClick } = props;
  return (
    <Box
      className={className}
      sx={{
        position: 'absolute',
        right: { xs: '5px', md: '20px' },
        zIndex: 2,
        display: 'flex !important',
        alignItems: 'center',
        justifyContent: 'center',
        width: { xs: '30px', sm: '40px' },
        height: { xs: '30px', sm: '40px' },
        backgroundColor: 'rgba(255, 255, 255, 0.8) !important',
        borderRadius: '50%',
        boxShadow: '0px 2px 5px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 1) !important',
        },
        '&::before': {
          display: 'none',
        }
      }}
      onClick={onClick}
    >
      <ArrowForwardIosIcon sx={{ fontSize: { xs: 18, sm: 24 }, color: 'primary.main' }} />
    </Box>
  );
};

const PrevArrow = (props: any) => {
  const { className, onClick } = props;
  return (
    <Box
      className={className}
      sx={{
        position: 'absolute',
        left: { xs: '5px', md: '20px' },
        zIndex: 2,
        display: 'flex !important',
        alignItems: 'center',
        justifyContent: 'center',
        width: { xs: '30px', sm: '40px' },
        height: { xs: '30px', sm: '40px' },
        backgroundColor: 'rgba(255, 255, 255, 0.8) !important',
        borderRadius: '50%',
        boxShadow: '0px 2px 5px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 1) !important',
        },
        '&::before': {
          display: 'none',
        }
      }}
      onClick={onClick}
    >
      <ArrowBackIosNewIcon sx={{ fontSize: { xs: 18, sm: 24 }, color: 'primary.main' }} />
    </Box>
  );
};

const PromoCarousel: React.FC<PromoCarouselProps> = ({
  autoplay = true,
  autoplaySpeed = 15000, // Увеличиваем время автопрокрутки до 15 секунд
  showArrows = true
}) => {
  const [promos, setPromos] = useState<PromoOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  // const navigate = useNavigate();

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const fetchedPromos = await PromoService.fetchPromoOffers();
      // Фильтруем только активные акции и сортируем по порядку
      const activePromos = fetchedPromos
        .filter(promo => promo.isActive && new Date(promo.endDate) >= new Date())
        .sort((a, b) => a.order - b.order);
      
      setPromos(activePromos);
    } catch (error) {
      console.error('Error fetching promo offers:', error);
      showNotification('Не удалось загрузить акционные предложения', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Настройки слайдера
  const settings = {
    dots: true,
    infinite: promos.length > 1, // Бесконечная прокрутка только если больше 1 акции
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: autoplay && promos.length > 1, // Автопрокрутка только если больше 1 акции
    autoplaySpeed,
    arrows: showArrows && promos.length > 1, // Стрелки только если больше 1 акции
    pauseOnHover: true,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      {
        breakpoint: 600,
        settings: {
          dots: true,
          arrows: false,
        }
      }
    ],
    appendDots: (dots: React.ReactNode) => (
      <Box sx={{ 
        position: 'absolute', 
        bottom: '8px', 
        width: '100%',
        '& .slick-dots li button:before': {
          color: 'white',
          opacity: 0.5,
          fontSize: '12px'
        },
        '& .slick-dots li.slick-active button:before': {
          color: 'white',
          opacity: 0.9
        }
      }}>
        <ul style={{ margin: 0 }}>{dots}</ul>
      </Box>
    ),
  };

  if (loading) {
    return <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loading /></Box>;
  }

  if (promos.length === 0) {
    return null; // Не показываем карусель, если нет активных акций
  }

  // Если только одна акция, не используем Slider (для избежания повторения)
  if (promos.length === 1) {
    const promo = promos[0];
    return (
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        <Paper 
          sx={{
            position: 'relative',
            height: { xs: '200px', sm: '300px', md: '400px' },
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: 3,
            cursor: promo.targetUrl ? 'pointer' : 'default',
            '&:hover': {
              boxShadow: 6,
              '& .MuiBox-root': {
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4)), url(${promo.imageUrl})`,
              }
            }
          }}
          onClick={() => { if (promo.targetUrl) window.open(promo.targetUrl, '_blank'); }}
        >
          <Box
            sx={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(${promo.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
            }}
          />
        </Paper>
      </Container>
    );
  }

  // Если несколько акций, используем компонент Slider
  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Slider {...settings}>
        {promos.map((promo) => (
          <Box key={promo._id}>
            <Paper 
              sx={{
                position: 'relative',
                height: { xs: '200px', sm: '300px', md: '400px' },
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: 3,
                cursor: promo.targetUrl ? 'pointer' : 'default',
                '&:hover': {
                  boxShadow: 6,
                  '& .MuiBox-root': {
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4)), url(${promo.imageUrl})`,
                  }
                }
              }}
              onClick={() => { if (promo.targetUrl) window.open(promo.targetUrl, '_blank'); }}
            >
              <Box
                sx={{
                  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url(${promo.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                }}
              />
            </Paper>
          </Box>
        ))}
      </Slider>
    </Container>
  );
};

export default PromoCarousel;