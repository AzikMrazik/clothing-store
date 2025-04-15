import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Grid
} from '@mui/material';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { LocalShipping } from '@mui/icons-material';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  zipCode: ''
};

const steps = ['Контактная информация', 'Адрес доставки', 'Подтверждение'];

const CheckoutForm = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  
  const { cart, clearCart } = useCart();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<FormData> = {};
    let isValid = true;

    switch (step) {
      case 0:
        if (!formData.firstName) {
          newErrors.firstName = 'Введите имя';
          isValid = false;
        }
        if (!formData.lastName) {
          newErrors.lastName = 'Введите фамилию';
          isValid = false;
        }
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Введите корректный email';
          isValid = false;
        }
        if (!formData.phone || !/^\+?[\d\s-]{10,}$/.test(formData.phone)) {
          newErrors.phone = 'Введите корректный номер телефона';
          isValid = false;
        }
        break;
      case 1:
        if (!formData.address) {
          newErrors.address = 'Введите адрес';
          isValid = false;
        }
        if (!formData.city) {
          newErrors.city = 'Введите город';
          isValid = false;
        }
        if (!formData.zipCode || !/^\d{5,6}$/.test(formData.zipCode)) {
          newErrors.zipCode = 'Введите корректный почтовый индекс';
          isValid = false;
        }
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      if (activeStep === steps.length - 1) {
        setIsConfirmationOpen(true);
      } else {
        setActiveStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      // Подготавливаем данные о заказе, включая информацию о скидках и доставке
      const orderData = {
        items: cart.items.map(item => ({
          _id: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl
        })),
        customerInfo: formData,
        subtotal: cart.subtotal || cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        discount: cart.discount || 0,
        deliveryCost: cart.deliveryCost || 0,
        total: calculateTotal(),
        promoCode: cart.appliedPromoCode ? cart.appliedPromoCode.code : undefined,
        freeDelivery: cart.freeDelivery || false
      };

      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const result = await response.json();

      if (result.status === 'success') {
        clearCart();
        showNotification('Заказ успешно оформлен!', 'success');
        navigate('/');
      } else {
        throw new Error(result.message || 'Failed to create order');
      }
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : 'Ошибка при оформлении заказа', 
        'error'
      );
    }
  };

  // Рассчитываем итоговую сумму с учетом скидок и доставки
  const calculateTotal = (): number => {
    const subtotal = cart.subtotal || cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = cart.discount || 0;
    const deliveryCost = cart.deliveryCost || 0;
    
    return subtotal - discount + deliveryCost;
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Имя"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName}
              required
            />
            <TextField
              label="Фамилия"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName}
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={!!errors.email}
              helperText={errors.email}
              required
            />
            <TextField
              label="Телефон"
              value={formData.phone}
              onChange={handleChange('phone')}
              error={!!errors.phone}
              helperText={errors.phone}
              required
            />
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Адрес"
              value={formData.address}
              onChange={handleChange('address')}
              error={!!errors.address}
              helperText={errors.address}
              required
            />
            <TextField
              label="Город"
              value={formData.city}
              onChange={handleChange('city')}
              error={!!errors.city}
              helperText={errors.city}
              required
            />
            <TextField
              label="Почтовый индекс"
              value={formData.zipCode}
              onChange={handleChange('zipCode')}
              error={!!errors.zipCode}
              helperText={errors.zipCode}
              required
            />
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Проверьте данные заказа
            </Typography>
            
            {/* Информация о покупателе */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Данные получателя
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Имя:</strong> {formData.firstName} {formData.lastName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Email:</strong> {formData.email}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Телефон:</strong> {formData.phone}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Адрес доставки:</strong> {formData.address}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Город:</strong> {formData.city}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Индекс:</strong> {formData.zipCode}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
            
            {/* Список товаров */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Товары
              </Typography>
              <List>
                {cart.items.map((item) => (
                  <ListItem key={item._id} disableGutters>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.quantity} шт. × ${Math.round(item.price)} ₽`}
                    />
                    <Typography>
                      {Math.round(item.quantity * item.price)} ₽
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Сводка по заказу */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Сводка заказа
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Подытог:</Typography>
                <Typography variant="body2">
                  {Math.round(cart.subtotal || cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0))} ₽
                </Typography>
              </Box>
              
              {/* Информация о доставке */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocalShipping fontSize="small" color="action" />
                  <Typography variant="body2">Доставка:</Typography>
                </Box>
                {cart.freeDelivery ? (
                  <Chip label="Бесплатно" color="success" size="small" variant="outlined" />
                ) : (
                  <Typography variant="body2">{Math.round(cart.deliveryCost || 0)} ₽</Typography>
                )}
              </Box>
              
              {/* Информация о промокоде и скидке */}
              {(cart.discount ?? 0) > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Скидка{cart.appliedPromoCode ? ` (${cart.appliedPromoCode.code})` : ''}:
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    -{Math.round(cart.discount ?? 0)} ₽
                  </Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 1.5 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <Typography variant="subtitle1">Итого:</Typography>
                <Typography variant="subtitle1" color="primary">
                  {Math.round(calculateTotal())} ₽
                </Typography>
              </Box>
            </Paper>
          </Box>
        );
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent(activeStep)}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
        {activeStep !== 0 && (
          <Button onClick={handleBack}>
            Назад
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleNext}
        >
          {activeStep === steps.length - 1 ? 'Оформить заказ' : 'Далее'}
        </Button>
      </Box>

      <Dialog 
        open={isConfirmationOpen} 
        onClose={() => setIsConfirmationOpen(false)}
      >
        <DialogTitle>Подтвердите заказ</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите оформить заказ на сумму {Math.round(calculateTotal())} ₽?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfirmationOpen(false)}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            autoFocus
          >
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CheckoutForm;