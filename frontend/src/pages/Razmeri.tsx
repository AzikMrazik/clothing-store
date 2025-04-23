import React from 'react';
import { Container, Typography, Box, CardMedia, Button } from '@mui/material';
// removed Grid import, using Box grid layout instead

// Replace these URLs with your bucket image URLs
const images = [
  'https://storage.yandexcloud.net/rvs-bucket/photo_2025-04-23_14-32-19.jpg',
  'https://storage.yandexcloud.net/rvs-bucket/photo_2025-04-23_14-32-26.jpg',
  'https://storage.yandexcloud.net/rvs-bucket/photo_2025-04-23_14-32-24.jpg',
  'https://storage.yandexcloud.net/rvs-bucket/photo_2025-04-23_14-32-29.jpg'
];

const Razmeri: React.FC = () => (
  <Container sx={{ py: 4 }}>
    <Typography variant="h3" gutterBottom>
      Таблицы размеров
    </Typography>
    <Typography variant="body1" sx={{ mb: 4 }}>
      Ниже представлены размерные таблицы. Если нужна помощь с выбором, свяжитесь с менеджером.
    </Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 4 }}>
      {images.map((src, idx) => (
        <Box key={idx} sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Таблица {idx + 1}
          </Typography>
          <CardMedia
            component="img"
            src={src}
            alt={`Таблица размеров ${idx + 1}`}
            sx={{ width: '100%', height: 'auto', borderRadius: 1 }}
          />
        </Box>
      ))}
    </Box>
    {/* Size charts section */}
    <Box sx={{ mt: 6 }}>
      <Typography variant="h4" gutterBottom>
        Размерные сетки
      </Typography>
      {Object.entries({
            'Взрослые': ['44','46','48','50','52','54','56','58','60','62','64'],
            'Женские': ['38','40','42','44','46','48','50','52'],
            'Детские': ['122','128','134','140','146','152','156','158'],
            'Обувь (RUS)': ['34','35','36','37','38','39','40','41','42','43','44','45','46','47'],
      }).map(([group, sizes]) => (
        <Box key={group} sx={{ mb: 3 }}>
          <Typography variant="h6">{group}</Typography>
          <Typography>{(sizes as string[]).join(', ')}</Typography>
        </Box>
      ))}
    </Box>
    <Box sx={{ textAlign: 'center', mt: 5 }}>
      <Button
        component="a"
        href="https://t.me/teg_managers"
        target="_blank"
        rel="noopener noreferrer"
        variant="contained"
        size="large"
      >
        Связаться с менеджером
      </Button>
    </Box>
  </Container>
);

export default Razmeri;
