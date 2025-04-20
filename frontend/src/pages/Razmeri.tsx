import React from 'react';
import { Container, Typography, Box, CardMedia, Button } from '@mui/material';
// removed Grid import, using Box grid layout instead

// Replace these paths with your own filename(s) placed in public/images/
const images = [
  '/images/my-table-female.jpg',
  '/images/my-table-male.jpg',
  '/images/my-table-kids.jpg',
  '/images/my-table-shoes.jpg'
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
        'Женские': ['XS','S','M','L','XL'],
        'Мужские': ['S','M','L','XL','XXL'],
        'Детские': ['XXS','XS','S','M']
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
