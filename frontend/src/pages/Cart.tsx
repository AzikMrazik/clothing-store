import { useMemo, useState } from 'react';
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
  TextField
} from '@mui/material';
import { Add, Remove, Delete, ShoppingBag, Share } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

const Cart = () => {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const { showNotification } = useNotification();

  const total = useMemo(() => 
    cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart.items]
  );

  const handleShare = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/cart/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: cart.items })
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

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        <Card sx={{ flex: 1 }}>
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
                        src={item.imageUrl}
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
            width: 300,
            position: 'sticky',
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
                {Math.round(total)} ₽
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            mb: 3
          }}>
            <Typography variant="h6">
              Итого
            </Typography>
            <Typography variant="h6" color="primary">
              {Math.round(total)} ₽
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            component="a"
            href="https://t.me/teg_managers"
            target="_blank"
            rel="noopener noreferrer"
          >
            Связаться с менеджером
          </Button>

          <Button
            variant="outlined"
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
