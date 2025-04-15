import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  InputAdornment,
  FormHelperText,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PercentIcon from '@mui/icons-material/Percent';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CodeIcon from '@mui/icons-material/Code';

import { PromoCode } from '../../types/models';
import { PromoService } from '../../services/PromoService';
import { useNotification } from '../../contexts/NotificationContext';
import Loading from '../Loading';

const PromoCodeManager: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10, // По умолчанию 10% или 10 руб.
    minOrderAmount: 1000,
    maxDiscountAmount: 0, // 0 означает "без ограничения"
    usageLimit: 0, // 0 означает "без ограничения"
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // По умолчанию +30 дней
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  useEffect(() => {
    if (editingPromoCode) {
      setFormData({
        code: editingPromoCode.code,
        description: editingPromoCode.description,
        discountType: editingPromoCode.discountType,
        discountValue: editingPromoCode.discountValue,
        minOrderAmount: editingPromoCode.minOrderAmount,
        maxDiscountAmount: editingPromoCode.maxDiscountAmount || 0,
        usageLimit: editingPromoCode.usageLimit || 0,
        startDate: new Date(editingPromoCode.startDate),
        endDate: new Date(editingPromoCode.endDate),
        isActive: editingPromoCode.isActive
      });
    } else {
      resetForm();
    }
  }, [editingPromoCode]);

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const fetchedPromoCodes = await PromoService.fetchPromoCodes();
      setPromoCodes(fetchedPromoCodes);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      showNotification('Не удалось загрузить промокоды', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: generateRandomCode(),
      description: '',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 1000,
      maxDiscountAmount: 0,
      usageLimit: 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    });
    setErrors({});
  };

  // Генерация случайного промокода
  const generateRandomCode = (): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 8;
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const handleGenerateCode = () => {
    setFormData(prev => ({
      ...prev,
      code: generateRandomCode()
    }));
  };

  const handleOpenDialog = (promoCode?: PromoCode) => {
    if (promoCode) {
      setEditingPromoCode(promoCode);
    } else {
      setEditingPromoCode(null);
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPromoCode(null);
    resetForm();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.code.trim()) {
      newErrors.code = 'Код промокода обязателен';
    } else if (!/^[A-Za-z0-9]+$/.test(formData.code)) {
      newErrors.code = 'Код должен содержать только буквы и цифры';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Описание промокода обязательно';
    }
    
    if (formData.discountValue <= 0) {
      newErrors.discountValue = 'Размер скидки должен быть больше нуля';
    } else if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      newErrors.discountValue = 'Процент скидки не может быть больше 100%';
    }

    if (formData.minOrderAmount < 0) {
      newErrors.minOrderAmount = 'Минимальная сумма заказа не может быть отрицательной';
    }

    if (formData.maxDiscountAmount < 0) {
      newErrors.maxDiscountAmount = 'Максимальная сумма скидки не может быть отрицательной';
    }

    if (formData.usageLimit < 0) {
      newErrors.usageLimit = 'Ограничение использования не может быть отрицательным';
    }

    if (formData.startDate >= formData.endDate) {
      newErrors.endDate = 'Дата окончания должна быть позже даты начала';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              (type === 'number' ? Number(value) : value)
    }));
  };

  const handleSelectChange = (e: any) => {
    const name = e.target.name;
    const value = e.target.value;
    
    if (name) {
      console.log(`Changing select ${name} to value: ${value}`);
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleDateChange = (name: string, date: Date | null) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        [name]: date
      }));
    }
  };

  const handleSubmit = async () => {
    console.log("Submitting promo code form...");
    console.log("Form data:", JSON.stringify(formData, null, 2));
    
    if (!validateForm()) {
      console.error("Form validation failed:", errors);
      return;
    }
    
    console.log("Validation passed, attempting to save promo code...");

    try {
      setLoading(true);

      if (editingPromoCode) {
        // Обновление существующего промокода
        console.log(`Updating existing promo code with ID: ${editingPromoCode._id}`);
        await PromoService.updatePromoCode(editingPromoCode._id, formData);
        showNotification('Промокод успешно обновлен', 'success');
      } else {
        // Создание нового промокода
        console.log("Creating new promo code with data:", JSON.stringify({
          ...formData
        }, null, 2));
        
        try {
          const result = await PromoService.createPromoCode({
            ...formData
          });
          console.log("Promo code created successfully:", result);
          showNotification('Промокод успешно создан', 'success');
        } catch (innerError) {
          console.error("Inner error during promo code creation:", innerError);
          throw innerError;
        }
      }

      handleCloseDialog();
      fetchPromoCodes();
    } catch (error) {
      console.error('Error during promo code submission:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      showNotification('Ошибка при сохранении промокода', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (promoCode: PromoCode) => {
    try {
      setLoading(true);
      await PromoService.updatePromoCode(promoCode._id, {
        isActive: !promoCode.isActive
      });
      showNotification(
        `Промокод ${!promoCode.isActive ? 'активирован' : 'деактивирован'}`, 
        'success'
      );
      fetchPromoCodes();
    } catch (error) {
      console.error('Error toggling promo code status:', error);
      showNotification('Ошибка при изменении статуса промокода', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromoCode = async (promoCode: PromoCode) => {
    if (window.confirm(`Вы действительно хотите удалить промокод "${promoCode.code}"?`)) {
      try {
        setLoading(true);
        await PromoService.deletePromoCode(promoCode._id);
        showNotification('Промокод успешно удален', 'success');
        fetchPromoCodes();
      } catch (error) {
        console.error('Error deleting promo code:', error);
        showNotification('Ошибка при удалении промокода', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const isPromoCodeActive = (promoCode: PromoCode): boolean => {
    const now = new Date();
    const startDate = new Date(promoCode.startDate);
    const endDate = new Date(promoCode.endDate);
    
    return promoCode.isActive && startDate <= now && endDate >= now;
  };

  const getPromoCodeStatus = (promoCode: PromoCode): string => {
    const now = new Date();
    const startDate = new Date(promoCode.startDate);
    const endDate = new Date(promoCode.endDate);
    
    if (!promoCode.isActive) return 'Неактивен';
    if (startDate > now) return 'Ожидает начала';
    if (endDate < now) return 'Истек';
    if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) return 'Исчерпан';
    return 'Активен';
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDiscount = (promoCode: PromoCode): string => {
    return promoCode.discountType === 'percentage'
      ? `${promoCode.discountValue}%`
      : `${promoCode.discountValue} ₽`;
  };

  if (loading && promoCodes.length === 0) {
    return <Loading />;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Управление промокодами
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Добавить промокод
        </Button>
      </Box>

      {promoCodes.length === 0 ? (
        <Alert severity="info">
          Промокоды не найдены. Создайте первый промокод, нажав на кнопку "Добавить промокод".
        </Alert>
      ) : (
        <List component={Paper} sx={{ width: '100%' }}>
          {promoCodes.map((promoCode) => {
            const isActive = isPromoCodeActive(promoCode);
            const status = getPromoCodeStatus(promoCode);
            
            return (
              <ListItem
                key={promoCode._id}
                sx={{ 
                  backgroundColor: isActive ? 'rgba(76, 175, 80, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                  borderLeft: isActive ? '3px solid green' : '3px solid gray',
                  mb: 1,
                  borderRadius: 1,
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="subtitle1" 
                            fontWeight="bold"
                            sx={{ 
                              fontFamily: 'monospace',
                              letterSpacing: '0.5px' 
                            }}
                          >
                            {promoCode.code}
                          </Typography>
                          <Chip 
                            label={formatDiscount(promoCode)} 
                            size="small" 
                            color={promoCode.discountType === 'percentage' ? 'primary' : 'secondary'}
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {promoCode.description}
                        </Typography>
                      }
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Мин. заказ: {promoCode.minOrderAmount} ₽
                      {promoCode.maxDiscountAmount > 0 && ` | Макс. скидка: ${promoCode.maxDiscountAmount} ₽`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(promoCode.startDate)} - {formatDate(promoCode.endDate)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Chip 
                        label={status} 
                        size="small" 
                        color={isActive ? 'success' : 'default'} 
                      />
                      <Chip 
                        label={`Использован: ${promoCode.usageCount}${promoCode.usageLimit ? `/${promoCode.usageLimit}` : ''}`} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  </Grid>
                </Grid>

                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    aria-label="edit" 
                    onClick={() => handleOpenDialog(promoCode)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                  <Switch
                    edge="end"
                    checked={promoCode.isActive}
                    onChange={() => handleToggleActive(promoCode)}
                    color="primary"
                    sx={{ mr: 1 }}
                  />
                  <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    onClick={() => handleDeletePromoCode(promoCode)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPromoCode ? `Редактирование промокода: ${editingPromoCode.code}` : 'Создание нового промокода'}
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={8}>
                <TextField
                  name="code"
                  label="Код промокода"
                  fullWidth
                  value={formData.code}
                  onChange={handleInputChange}
                  error={!!errors.code}
                  helperText={errors.code}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CodeIcon />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    style: { textTransform: 'uppercase' }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={handleGenerateCode}
                  sx={{ height: '56px' }}
                >
                  Сгенерировать код
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Описание"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={handleInputChange}
                  error={!!errors.description}
                  helperText={errors.description}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="discount-type-label">Тип скидки</InputLabel>
                  <Select
                    labelId="discount-type-label"
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleSelectChange}
                    label="Тип скидки"
                  >
                    <MenuItem value="percentage">Процент от суммы</MenuItem>
                    <MenuItem value="fixed">Фиксированная сумма</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="discountValue"
                  label={formData.discountType === 'percentage' ? 'Процент скидки' : 'Сумма скидки'}
                  type="number"
                  fullWidth
                  value={formData.discountValue}
                  onChange={handleInputChange}
                  error={!!errors.discountValue}
                  helperText={errors.discountValue}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {formData.discountType === 'percentage' ? (
                          <PercentIcon />
                        ) : (
                          <AttachMoneyIcon />
                        )}
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="minOrderAmount"
                  label="Минимальная сумма заказа"
                  type="number"
                  fullWidth
                  value={formData.minOrderAmount}
                  onChange={handleInputChange}
                  error={!!errors.minOrderAmount}
                  helperText={errors.minOrderAmount}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="maxDiscountAmount"
                  label="Максимальная сумма скидки"
                  type="number"
                  fullWidth
                  value={formData.maxDiscountAmount}
                  onChange={handleInputChange}
                  error={!!errors.maxDiscountAmount}
                  helperText={errors.maxDiscountAmount || 'Оставьте 0 для снятия ограничения'}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="usageLimit"
                  label="Ограничение использований"
                  type="number"
                  fullWidth
                  value={formData.usageLimit}
                  onChange={handleInputChange}
                  error={!!errors.usageLimit}
                  helperText={errors.usageLimit || 'Оставьте 0 для снятия ограничения'}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                {editingPromoCode && (
                  <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2">
                      Использован: {editingPromoCode.usageCount} раз
                    </Typography>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Дата начала"
                  value={formData.startDate}
                  onChange={(date) => handleDateChange('startDate', date)}
                  format="dd.MM.yyyy HH:mm"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Дата окончания"
                  value={formData.endDate}
                  onChange={(date) => handleDateChange('endDate', date)}
                  format="dd.MM.yyyy HH:mm"
                />
                {errors.endDate && (
                  <FormHelperText error>{errors.endDate}</FormHelperText>
                )}
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      color="primary"
                    />
                  }
                  label="Промокод активен"
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {editingPromoCode ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PromoCodeManager;