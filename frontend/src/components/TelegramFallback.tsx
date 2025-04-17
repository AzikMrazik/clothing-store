import React from 'react';
import { Container, Box, Typography, Button } from '@mui/material';

const TelegramFallback: React.FC = () => {
  // Detect only Telegram WebApp environment
  if (typeof window === 'undefined') return null;
  const anyWin = window as any;
  if (!anyWin.Telegram || !anyWin.Telegram.WebApp) return null;

  return (
    <Container 
      sx={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'white', zIndex: 1300, p: 2
      }}
    >
      <Box textAlign="center">
        <Typography variant="h5" gutterBottom>
          Откройте в браузере
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Для корректного просмотра этого сайта откройте его в браузере вашего устройства.
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.open(window.location.href, '_blank')}
        >
          Открыть в браузере
        </Button>
      </Box>
    </Container>
  );
};

export default TelegramFallback;
