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
  Alert
} from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import { Category } from '../../types/models';
import { CategoryService } from '../../services/CategoryService';
import { useNotification } from '../../contexts/NotificationContext';
import Loading from '../Loading';

const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    isActive: true,
    imageUrl: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name,
        slug: editingCategory.slug,
        isActive: editingCategory.isActive,
        imageUrl: editingCategory.imageUrl || ''
      });
    } else {
      resetForm();
    }
  }, [editingCategory]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const fetchedCategories = await CategoryService.fetchCategories();
      // Сортируем категории по порядку
      setCategories(fetchedCategories.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error fetching categories:', error);
      showNotification('Не удалось загрузить категории', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      isActive: true,
      imageUrl: ''
    });
    setErrors({});
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
    } else {
      setEditingCategory(null);
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
    resetForm();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Название категории обязательно';
    }
    
    if (!formData.slug.trim()) {
      newErrors.slug = 'URL-имя категории обязательно';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'URL-имя может содержать только строчные буквы латинского алфавита, цифры и дефисы';
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
    
    // Автоматическая генерация slug из названия
    if (name === 'name' && !editingCategory) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-zа-яё0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[а-яё]/g, (char) => {
          const cyrillicToLatin: Record<string, string> = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 
            'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 
            'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
            'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 
            'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
          };
          return cyrillicToLatin[char] || '';
        });
      
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/categories/upload', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': getCsrfToken() || '' },
      body: formData
    });
    const data = await res.json();
    setFormData(prev => ({ ...prev, imageUrl: data.url }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (editingCategory) {
        // Обновление существующей категории
        await CategoryService.updateCategory(editingCategory._id, formData);
        showNotification('Категория успешно обновлена', 'success');
      } else {
        // Создание новой категории
        // Находим максимальный порядок и увеличиваем на 1
        const maxOrder = categories.length > 0 
          ? Math.max(...categories.map(c => c.order)) 
          : 0;
        
        await CategoryService.createCategory({
          ...formData,
          order: maxOrder + 1,
          isActive: formData.isActive
        });
        showNotification('Категория успешно создана', 'success');
      }

      handleCloseDialog();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      showNotification('Ошибка при сохранении категории', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      setLoading(true);
      await CategoryService.updateCategory(category._id, {
        isActive: !category.isActive
      });
      showNotification(`Категория ${!category.isActive ? 'активирована' : 'деактивирована'}`, 'success');
      fetchCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
      showNotification('Ошибка при изменении статуса категории', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (window.confirm(`Вы действительно хотите удалить категорию "${category.name}"?`)) {
      try {
        setLoading(true);
        await CategoryService.deleteCategory(category._id);
        showNotification('Категория успешно удалена', 'success');
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('Ошибка при удалении категории', 'error');
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

    // Создаем копию массива категорий
    const updatedCategories = [...categories];
    // Удаляем элемент из исходной позиции
    const [movedCategory] = updatedCategories.splice(result.source.index, 1);
    // Вставляем его в новую позицию
    updatedCategories.splice(result.destination.index, 0, movedCategory);

    // Обновляем порядок категорий
    const reorderedCategories = updatedCategories.map((category, index) => ({
      ...category,
      order: index + 1
    }));

    // Временно обновляем UI для лучшего UX
    setCategories(reorderedCategories);

    // Отправляем обновленный порядок на сервер
    try {
      const orderUpdates = reorderedCategories.map(cat => ({
        _id: cat._id,
        order: cat.order
      }));

      await CategoryService.updateCategoryOrder(orderUpdates);
      showNotification('Порядок категорий успешно обновлен', 'success');
    } catch (error) {
      console.error('Error updating category order:', error);
      showNotification('Ошибка при обновлении порядка категорий', 'error');
      // В случае ошибки возвращаем исходный порядок
      fetchCategories();
    }
  };

  if (loading && categories.length === 0) {
    return <Loading />;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Управление категориями
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Добавить категорию
        </Button>
      </Box>

      {categories.length === 0 ? (
        <Alert severity="info">
          Категории не найдены. Создайте первую категорию, нажав на кнопку "Добавить категорию".
        </Alert>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <List 
                {...provided.droppableProps}
                ref={provided.innerRef}
                component={Paper}
                sx={{ width: '100%' }}
              >
                {categories.map((category, index) => (
                  <Draggable key={category._id} draggableId={category._id} index={index}>
                    {(provided) => (
                      <ListItem
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        sx={{ 
                          backgroundColor: category.isActive ? 'transparent' : 'rgba(0, 0, 0, 0.05)',
                          borderLeft: category.isActive ? '3px solid green' : '3px solid gray',
                        }}
                      >
                        <Box {...provided.dragHandleProps} sx={{ mr: 2, cursor: 'grab' }}>
                          <DragIndicatorIcon color="action" />
                        </Box>
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight="bold">
                              {category.name}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              /{category.slug}/ • {category.isActive ? 'Активна' : 'Неактивна'}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            aria-label="edit" 
                            onClick={() => handleOpenDialog(category)}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          <Switch
                            edge="end"
                            checked={category.isActive}
                            onChange={() => handleToggleActive(category)}
                            color="primary"
                            sx={{ mr: 1 }}
                          />
                          <IconButton 
                            edge="end" 
                            aria-label="delete" 
                            onClick={() => handleDeleteCategory(category)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </List>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCategory ? `Редактирование категории: ${editingCategory.name}` : 'Создание новой категории'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 45%' }}>
              <TextField
                name="name"
                label="Название категории"
                fullWidth
                value={formData.name}
                onChange={handleInputChange}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Box>
            <Box sx={{ flex: '1 1 45%' }}>
              <TextField
                name="slug"
                label="URL-имя (slug)"
                fullWidth
                value={formData.slug}
                onChange={handleInputChange}
                error={!!errors.slug}
                helperText={errors.slug || 'Например: winter-collection, t-shirts, new-arrivals'}
                required
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
            <Box sx={{ flex: '1 1 100%' }}>
              <FormControlLabel
                control={
                  <Switch
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    color="primary"
                  />
                }
                label="Категория активна"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {editingCategory ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryManager;