import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import { theme } from './theme';
import Catalog from './pages/Catalog';
import Cart from './pages/Cart';
import AdminPanel from './pages/AdminPanel';
import SharedCart from './pages/SharedCart';
import ProductDetails from './pages/ProductDetails';
import Login from './pages/Login';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import SecurityInitializer from './components/SecurityInitializer';
import { CartProvider } from './contexts/CartContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider } from './contexts/AuthContext';
import TelegramFallback from './components/TelegramFallback';

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Catalog />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          } 
        />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/shared-cart/:id" element={<SharedCart />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <>
      <TelegramFallback />
      <ErrorBoundary>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <NotificationProvider>
            <LoadingProvider>
              <AuthProvider>
                <CartProvider>
                  {/* Оборачиваем SecurityInitializer в отдельный ErrorBoundary */}
                  <ErrorBoundary fallback={<div>Ошибка инициализации безопасности, но приложение продолжает работать</div>}>
                    <SecurityInitializer />
                  </ErrorBoundary>
                  <BrowserRouter>
                    <Navigation />
                    <AnimatedRoutes />
                  </BrowserRouter>
                </CartProvider>
              </AuthProvider>
            </LoadingProvider>
          </NotificationProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </>
  );
}

export default App;
