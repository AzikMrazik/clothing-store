import { useMemo, useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  List,
  ListItem,
  Box,
  IconButton,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { Add, Remove, Delete, ShoppingBag, Share, LocalShipping, Check } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { API_URL } from '../config';
import { PromoService } from '../services/PromoService';
import { DeliverySettings } from '../types/models';

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, updateCart } = useCart();
  const navigate = useNavigate();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const { showNotification } = useNotification();
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  // Жестко задаём стоимость доставки и не делаем запросов к PromoService.getDeliverySettings()
  const [deliverySettings] = useState<DeliverySettings>({
    defaultCost: 700,
    freeDeliveryThreshold: 5000
  });

  const subtotal = useMemo(() => 
    cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart.items]
  );

  // Вычисляем стоимость доставки
  const delivery = useMemo(() => {
    return PromoService.calculateDelivery(subtotal, deliverySettings);
  }, [subtotal, deliverySettings]);

  // Вычисляем общую сумму с учетом скидки и доставки
  const total = useMemo(() => {
    const discount = cart.discount || 0;
    // Если доставка бесплатная, не добавляем стоимость доставки к общей сумме
    const deliveryCost = delivery.freeDelivery || delivery.deliveryCost <= 0 ? 0 : delivery.deliveryCost;
    return subtotal - discount + deliveryCost;
  }, [subtotal, cart.discount, delivery.deliveryCost, delivery.freeDelivery]);

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Введите промокод');
      return;
    }

    setIsApplyingPromo(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const result = await PromoService.applyPromoCode(promoCode.trim(), subtotal);
      
      if (result.error) {
        setPromoError(result.error);
        return;
      }

      if (result.promoCode && result.discount > 0) {
        // Применяем промокод к корзине
        updateCart({
          ...cart,
          subtotal,
          discount: result.discount,
          appliedPromoCode: result.promoCode,
          deliveryCost: delivery.deliveryCost,
          freeDelivery: delivery.freeDelivery
        });

        const discountTypeText = result.promoCode.discountType === 'percentage' 
          ? `${result.promoCode.discountValue}%` 
          : `${result.promoCode.discountValue} ₽`;

        setPromoSuccess(`Промокод применен: ${discountTypeText} скидка`);
      } else {
        setPromoError('Промокод не может быть применен');
      }
    } catch (error) {
      setPromoError('Ошибка при применении промокода');
      console.error('Failed to apply promo code:', error);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromoCode = () => {
    updateCart({
      ...cart,
      subtotal,
      discount: 0,
      appliedPromoCode: undefined,
      deliveryCost: delivery.deliveryCost,
      freeDelivery: delivery.freeDelivery
    });
    setPromoCode('');
    setPromoError(null);
    setPromoSuccess(null);
  };

  const handleShare = async () => {
    try {
      const response = await fetch(`${API_URL}/cart/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: cart.items }),
      });

      if (!response.ok) {
        throw new Error('Failed to share cart');
      }

      const { shareId } = await response.json();
      const shareUrl = `${window.location.origin}/shared-cart/${shareId}`;
      setShareLink(shareUrl);
      setIsShareDialogOpen(true);
    } catch (error) {
      showNotification('Не удалось создать ссылку на корзину', 'error');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    showNotification('Ссылка скопирована', 'success');
  };

  // Обновляем информацию о стоимости доставки в корзине при изменении условий
  useEffect(() => {
    if (cart.items.length > 0) {
      updateCart({
        ...cart,
        subtotal,
        deliveryCost: delivery.deliveryCost,
        freeDelivery: delivery.freeDelivery
      });
    }
  }, [delivery.deliveryCost, delivery.freeDelivery]);

  if (!cart.items.length) {
    return (
      <Container 
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        maxWidth="md" 
        sx={{ 
          py: 8,
          textAlign: 'center'
        }}
      >
        <ShoppingBag sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom color="text.secondary">
          Ваша корзина пуста
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Перейти к покупкам
        </Button>
      </Container>
    );
  }

  return (
    <Container 
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      maxWidth="lg" 
      sx={{ py: 4 }}
    >
      <Typography variant="h4" gutterBottom>
        Корзина
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexDirection: { xs: 'column', md: 'row' } }}>
        <Card sx={{ flex: 1, width: '100%' }}>
          <CardContent>
            <List sx={{ p: 0 }}>
              <AnimatePresence initial={false}>
                {cart.items.map((item) => (
                  <motion.div
                    key={item._id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ListItem
                      sx={{
                        display: 'flex',
                        gap: 2,
                        py: 2,
                        '&:not(:last-child)': {
                          borderBottom: 1,
                          borderColor: 'divider'
                        }
                      }}
                    >
                      <Box
                        component="img"
                        src={item.images?.[0] || '/placeholder-product.jpg'}
                        alt={item.name}
                        sx={{
                          width: 80,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: 1
                        }}
                      />
                      
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {item.name}
                        </Typography>
                        {/* Show chosen size and color */}
                        {item.selectedSize && (
                          <Typography variant="body2" color="text.secondary">
                            Размер: {item.selectedSize}
                          </Typography>
                        )}
                        {item.selectedColor && (
                          <Typography variant="body2" color="text.secondary">
                            Цвет: {item.selectedColor}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">
                          {Math.round(item.price)} ₽
                        </Typography>
                      </Box>

                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Remove />
                        </IconButton>
                        <Typography sx={{ minWidth: 40, textAlign: 'center' }}>
                          {item.quantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        >
                          <Add />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => removeFromCart(item._id)}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </ListItem>
                  </motion.div>
                ))}
              </AnimatePresence>
            </List>
          </CardContent>
        </Card>

        <Paper 
          sx={{ 
            width: { xs: '100%', md: 320 },
            position: { xs: 'static', md: 'sticky' },
            top: 24,
            p: 3
          }}
        >
          <Typography variant="h6" gutterBottom>
            Сумма заказа
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              mb: 1
            }}>
              <Typography color="text.secondary">
                Товары ({cart.items.length})
              </Typography>
              <Typography>
                {Math.round(subtotal)} ₽
              </Typography>
            </Box>

            {/* Блок доставки */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              mb: 1,
              alignItems: 'center'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocalShipping fontSize="small" color="action" />
                <Typography color="text.secondary">
                  Доставка
                </Typography>
              </Box>
              {delivery.freeDelivery || delivery.deliveryCost <= 0 ? (
                <Typography color="success.main">Бесплатно</Typography>
              ) : (
                <Typography>{Math.round(delivery.deliveryCost)} ₽</Typography>
              )}
            </Box>

            {/* Информация о бесплатной доставке */}
            {!delivery.freeDelivery && (
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'info.main',
                color: 'white',
                borderRadius: 1,
                p: 1,
                mt: 1,
                mb: 1,
                fontSize: '0.875rem'
              }}>
                <Typography variant="body2">
                  До бесплатной доставки: {Math.round(deliverySettings.freeDeliveryThreshold - subtotal)} ₽
                </Typography>
              </Box>
            )}

            {/* Скидка по промокоду */}
            {cart.discount !== undefined && cart.discount > 0 && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                mb: 1,
                color: 'success.main'
              }}>
                <Typography>Скидка</Typography>
                <Typography>-{Math.round(cart.discount ?? 0)} ₽</Typography>
              </Box>
            )}
          </Box>

          {/* Блок промокода */}
          <Box sx={{ my: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Промокод
            </Typography>
            
            {cart.appliedPromoCode ? (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1,
                bgcolor: 'success.light',
                borderRadius: 1,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Check fontSize="small" color="success" />
                  <Typography variant="body2" color="text.primary">
                    {cart.appliedPromoCode.code}
                  </Typography>
                </Box>
                <Button 
                  size="small" 
                  color="error" 
                  onClick={handleRemovePromoCode}
                >
                  Удалить
                </Button>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Введите промокод"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    InputProps={{
                      endAdornment: isApplyingPromo ? (
                        <InputAdornment position="end">
                          <CircularProgress size={20} />
                        </InputAdornment>
                      ) : null
                    }}
                  />
                  <Button 
                    variant="outlined" 
                    onClick={handleApplyPromoCode}
                    disabled={isApplyingPromo || !promoCode.trim()}
                  >
                    Применить
                  </Button>
                </Box>
                {promoError && (
                  <Alert severity="error" sx={{ mt: 1, fontSize: '0.75rem' }}>
                    {promoError}
                  </Alert>
                )}
                {promoSuccess && (
                  <Alert severity="success" sx={{ mt: 1, fontSize: '0.75rem' }}>
                    {promoSuccess}
                  </Alert>
                )}
              </>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            mb: 1.5  // Уменьшаем отступ с 3 до 1.5
          }}>
            <Typography variant="h6">
              Итого
            </Typography>
            <Typography variant="h6" color="primary">
              {Math.round(total)} ₽
            </Typography>
          </Box>

          <Button
            variant="contained"  // Меняем с outlined на contained
            color="primary"      // Добавляем синий цвет
            size="large"
            fullWidth
            component="a"
            href="https://t.me/teg_managers"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mt: 2 }}
          >
            Связаться с менеджером
          </Button>

          <Button
            variant="text"
            size="large"
            fullWidth
            startIcon={<Share />}
            onClick={handleShare}
            sx={{ mt: 2 }}
          >
            Поделиться корзиной
          </Button>
        </Paper>
      </Box>

      <Dialog
        open={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
      >
        <DialogTitle>Поделиться корзиной</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            value={shareLink}
            margin="normal"
            InputProps={{
              readOnly: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsShareDialogOpen(false)}>
            Закрыть
          </Button>
          <Button variant="contained" onClick={handleCopyLink}>
            Копировать ссылку
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Cart;
