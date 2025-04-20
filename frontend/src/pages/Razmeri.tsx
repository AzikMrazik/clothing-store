import React from 'react';
import { Container, Typography, Box, Grid, CardMedia, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const images = [
  '/images/razmer1.jpg',
  '/images/razmer2.jpg',
  '/images/razmer3.jpg',
  '/images/razmer4.jpg'
];

const Razmeri: React.FC = () => (
  <Container sx={{ py: 4 }}>
    <Typography variant="h3" gutterBottom>
      Таблицы размеров
    </Typography>
    <Typography variant="body1" sx={{ mb: 4 }}>
      Ниже представлены размерные таблицы. Если нужна помощь с выбором, свяжитесь с менеджером.
    </Typography>
    <Grid container spacing={4}>
      {images.map((src, idx) => (
        <Grid item xs={12} sm={6} md={3} key={idx}>
          <Box sx={{ textAlign: 'center' }}>
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
        </Grid>
      ))}
    </Grid>
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
