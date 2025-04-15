import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
}

const Loading = ({ fullScreen = false, message = 'Загрузка...' }: LoadingProps) => {
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
        <CircularProgress size={60} />
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
      <CircularProgress size={40} />
      <Typography sx={{ mt: 2 }} variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default Loading;