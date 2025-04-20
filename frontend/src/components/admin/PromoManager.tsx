import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Card,
  CardContent,
  CardMedia,
  FormHelperText,
  InputAdornment
} from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ImageIcon from '@mui/icons-material/Image';
import { API_URL } from '../../config';

import { PromoOffer } from '../../types/models';
import { PromoService } from '../../services/PromoService';
import { useNotification } from '../../contexts/NotificationContext';
import Loading from '../Loading';

const PromoManager: React.FC = () => {
  const [promos, setPromos] = useState<PromoOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoOffer | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // По умолчанию +30 дней
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchPromos();
  }, []);

  useEffect(() => {
    if (editingPromo) {
      setFormData({
        title: editingPromo.title,
        imageUrl: editingPromo.imageUrl,
        startDate: new Date(editingPromo.startDate),
        endDate: new Date(editingPromo.endDate),
        isActive: editingPromo.isActive
      });
    } else {
      resetForm();
    }
  }, [editingPromo]);

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const fetchedPromos = await PromoService.fetchPromoOffers();
      // Сортируем акции по порядку
      setPromos(fetchedPromos.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error fetching promo offers:', error);
      showNotification('Не удалось загрузить промо-акции', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      imageUrl: '',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    });
    setErrors({});
  };

  const handleOpenDialog = (promo?: PromoOffer) => {
    if (promo) {
      setEditingPromo(promo);
    } else {
      setEditingPromo(null);
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPromo(null);
    resetForm();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Заголовок акции обязателен';
    }
    if (!formData.imageUrl.trim()) {
      newErrors.imageUrl = 'URL изображения обязателен';
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
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDateChange = (name: string, date: Date | null) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        [name]: date
      }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/promos/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    setFormData(prev => ({ ...prev, imageUrl: data.url }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (editingPromo) {
        // Обновление существующей акции
        await PromoService.updatePromoOffer(editingPromo._id, {
          title: formData.title,
          imageUrl: formData.imageUrl,
          startDate: formData.startDate,
          endDate: formData.endDate,
          isActive: formData.isActive
        });
        showNotification('Промо-акция успешно обновлена', 'success');
      } else {
        // Создание новой акции
        // Находим максимальный порядок и увеличиваем на 1
        const maxOrder = promos.length > 0 
          ? Math.max(...promos.map(p => p.order)) 
          : 0;
        await PromoService.createPromoOffer({
          title: formData.title,
          imageUrl: formData.imageUrl,
          startDate: formData.startDate,
          endDate: formData.endDate,
          isActive: formData.isActive,
          order: maxOrder + 1
        });
        showNotification('Промо-акция успешно создана', 'success');
      }

      handleCloseDialog();
      fetchPromos();
    } catch (error) {
      console.error('Error saving promo offer:', error);
      showNotification('Ошибка при сохранении промо-акции', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (promo: PromoOffer) => {
    try {
      setLoading(true);
      await PromoService.updatePromoOffer(promo._id, {
        isActive: !promo.isActive
      });
      showNotification(
        `Акция ${!promo.isActive ? 'активирована' : 'деактивирована'}`, 
        'success'
      );
      fetchPromos();
    } catch (error) {
      console.error('Error toggling promo status:', error);
      showNotification('Ошибка при изменении статуса акции', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromo = async (promo: PromoOffer) => {
    if (window.confirm(`Вы действительно хотите удалить акцию "${promo.title}"?`)) {
      try {
        setLoading(true);
        await PromoService.deletePromoOffer(promo._id);
        showNotification('Акция успешно удалена', 'success');
        fetchPromos();
      } catch (error) {
        console.error('Error deleting promo:', error);
        showNotification('Ошибка при удалении акции', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDragEnd = async (result: any) => {
    // Если элемент перетащен за пределы списка или на то же место
    if (!result.destination || result.destination.index === result.source.index) {
      return;
    }

    // Создаем копию массива акций
    const updatedPromos = [...promos];
    // Удаляем элемент из исходной позиции
    const [movedPromo] = updatedPromos.splice(result.source.index, 1);
    // Вставляем его в новую позицию
    updatedPromos.splice(result.destination.index, 0, movedPromo);

    // Обновляем порядок акций
    const reorderedPromos = updatedPromos.map((promo, index) => ({
      ...promo,
      order: index + 1
    }));

    // Временно обновляем UI для лучшего UX
    setPromos(reorderedPromos);

    // Отправляем обновленный порядок на сервер
    try {
      const orderUpdates = reorderedPromos.map(p => ({
        _id: p._id,
        order: p.order
      }));

      await PromoService.updatePromoOrder(orderUpdates);
      showNotification('Порядок акций успешно обновлен', 'success');
    } catch (error) {
      console.error('Error updating promo order:', error);
      showNotification('Ошибка при обновлении порядка акций', 'error');
      // В случае ошибки возвращаем исходный порядок
      fetchPromos();
    }
  };

  const isPromoActive = (promo: PromoOffer): boolean => {
    const now = new Date();
    const startDate = new Date(promo.startDate);
    const endDate = new Date(promo.endDate);
    
    return promo.isActive && startDate <= now && endDate >= now;
  };

  const getPromoStatus = (promo: PromoOffer): string => {
    const now = new Date();
    const startDate = new Date(promo.startDate);
    const endDate = new Date(promo.endDate);
    
    if (!promo.isActive) return 'Неактивна';
    if (startDate > now) return 'Ожидает начала';
    if (endDate < now) return 'Завершена';
    return 'Активна';
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

  if (loading && promos.length === 0) {
    return <Loading />;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Управление промо-акциями
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Добавить акцию
        </Button>
      </Box>

      {promos.length === 0 ? (
        <Alert severity="info">
          Промо-акции не найдены. Создайте первую акцию, нажав на кнопку "Добавить акцию".
        </Alert>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="promos">
            {(provided) => (
              <List 
                {...provided.droppableProps}
                ref={provided.innerRef}
                component={Paper}
                sx={{ width: '100%' }}
              >
                {promos.map((promo, index) => {
                  const isActive = isPromoActive(promo);
                  const status = getPromoStatus(promo);
                  
                  return (
                    <Draggable key={promo._id} draggableId={promo._id} index={index}>
                      {(provided) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          sx={{ 
                            backgroundColor: isActive ? 'rgba(76, 175, 80, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                            borderLeft: isActive ? '3px solid green' : '3px solid gray',
                            mb: 1,
                            borderRadius: 1,
                          }}
                        >
                          <Box {...provided.dragHandleProps} sx={{ mr: 2, cursor: 'grab' }}>
                            <DragIndicatorIcon color="action" />
                          </Box>
                          
                          <Box sx={{ width: { xs: '100%', sm: '25%', md: '16.66%' }, pr: 2 }}>
                            {promo.imageUrl && (
                              <Card sx={{ height: '100%' }}>
                                <CardMedia
                                  component="img"
                                  image={promo.imageUrl}
                                  alt={promo.title}
                                  sx={{ height: 100, objectFit: 'cover' }}
                                />
                              </Card>
                            )}
                          </Box>
                          
                          <Box sx={{ flex: 1 }}>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {promo.title} <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>({status})</Typography>
                                </Typography>
                              }
                              secondary={
                                <Typography variant="body2" color="text.secondary">
                                  С {formatDate(promo.startDate)} по {formatDate(promo.endDate)}
                                </Typography>
                              }
                            />
                          </Box>
                          
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              aria-label="edit" 
                              onClick={() => handleOpenDialog(promo)}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon />
                            </IconButton>
                            <Switch
                              edge="end"
                              checked={promo.isActive}
                              onChange={() => handleToggleActive(promo)}
                              color="primary"
                              sx={{ mr: 1 }}
                            />
                            <IconButton 
                              edge="end" 
                              aria-label="delete" 
                              onClick={() => handleDeletePromo(promo)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </List>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPromo ? `Редактирование акции: ${editingPromo.title}` : 'Создание новой акции'}
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <Box sx={{ mt: 1 }}>
              <Box sx={{ mb: 2 }}>
                <TextField
                  name="title"
                  label="Заголовок акции"
                  fullWidth
                  value={formData.title}
                  onChange={handleInputChange}
                  error={!!errors.title}
                  helperText={errors.title}
                  required
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <TextField
                  name="imageUrl"
                  label="URL изображения"
                  fullWidth
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  error={!!errors.imageUrl}
                  helperText={errors.imageUrl}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ImageIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <DateTimePicker
                  label="Дата начала"
                  value={formData.startDate}
                  onChange={(date) => handleDateChange('startDate', date)}
                  format="dd.MM.yyyy HH:mm"
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <DateTimePicker
                  label="Дата окончания"
                  value={formData.endDate}
                  onChange={(date) => handleDateChange('endDate', date)}
                  format="dd.MM.yyyy HH:mm"
                />
                {errors.endDate && (
                  <FormHelperText error>{errors.endDate}</FormHelperText>
                )}
              </Box>
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      color="primary"
                    />
                  }
                  label="Акция активна"
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Button variant="outlined" component="label">
                  Загрузить изображение
                  <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleImageUpload} />
                </Button>
                {formData.imageUrl && (
                  <Box sx={{ mt: 1 }}>
                    <img src={formData.imageUrl} alt="preview" style={{ maxWidth: 200, maxHeight: 120 }} />
                  </Box>
                )}
              </Box>

              {formData.imageUrl && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Предпросмотр баннера:
                  </Typography>
                  <Card sx={{ maxWidth: 600, mx: 'auto' }}>
                    <CardMedia
                      component="img"
                      image={formData.imageUrl}
                      alt="Предпросмотр баннера"
                      sx={{ height: 200 }}
                    />
                    <CardContent>
                      <Typography variant="h6">{formData.title}</Typography>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {editingPromo ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PromoManager;