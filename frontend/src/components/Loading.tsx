// Импорт React не нужен с версии React 17+ при использовании JSX Transform
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
  size?: number;  // Добавляем поддержку свойства size
}

const Loading = ({ fullScreen = false, message = 'Загрузка...', size = 40 }: LoadingProps) => {
  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 9999,
        }}
      >
        <CircularProgress size={size || 60} />
        <Typography sx={{ mt: 2 }} variant="h6">
          {message}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
      }}
    >
      <CircularProgress size={size} />
      <Typography sx={{ mt: 2 }} variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default Loading;