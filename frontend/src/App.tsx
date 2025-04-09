import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import { theme } from './theme';
import Catalog from './pages/Catalog';
import Cart from './pages/Cart';
import AdminPanel from './pages/AdminPanel';
import SharedCart from './pages/SharedCart';
import ProductDetails from './pages/ProductDetails';
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';
import { CartProvider } from './contexts/CartContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { NotificationProvider } from './contexts/NotificationContext';

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Catalog />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/shared-cart/:id" element={<SharedCart />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>
          <LoadingProvider>
            <CartProvider>
              <BrowserRouter>
                <Navigation />
                <AnimatedRoutes />
              </BrowserRouter>
            </CartProvider>
          </LoadingProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
