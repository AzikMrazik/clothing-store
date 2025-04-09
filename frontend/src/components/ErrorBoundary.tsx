import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { Warning } from '@mui/icons-material';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80vh',
              textAlign: 'center',
              gap: 2
            }}
          >
            <Warning color="error" sx={{ fontSize: 64 }} />
            <Typography variant="h5" gutterBottom>
              Что-то пошло не так
            </Typography>
            <Typography color="text.secondary" paragraph>
              {this.state.error?.message || 'Произошла непредвиденная ошибка'}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={this.handleRetry}
            >
              Попробовать снова
            </Button>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;