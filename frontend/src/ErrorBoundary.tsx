import React from 'react';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ hasError: true });
    // Отправляем на сервер детали ошибки
    try {
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        })
      });
    } catch (e) {
      console.error('Error reporting failed:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return <div>Произошла ошибка. Мы уже работаем над её исправлением.</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;