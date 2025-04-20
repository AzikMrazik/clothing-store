import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Snackbar,
  Alert,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  SelectChangeEvent,
  Autocomplete
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit, Delete } from '@mui/icons-material';
import { API_URL } from '../config';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CategoryManager from '../components/admin/CategoryManager';
import PromoManager from '../components/admin/PromoManager';
import PromoCodeManager from '../components/admin/PromoCodeManager';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getCsrfToken } from '../utils/config';

interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  additionalImages: string[];
  videoUrl?: string;
  category: string;
  categories?: string[];
  images: string[];
}

type ProductForm = {
  _id?: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  videoUrl?: string;
  categories: string[];
  sizes?: string[];    // available sizes
  colors?: string[];   // available colors
  newCategory?: string;
  newCategorySelected?: boolean;
};

const AdminPanel = () => {
  // Static options for sizes and colors
  const sizeOptions = ['XS','S','M','L','XL','XXL'];
  const colorOptions = ['Белый','Черный','Красный','Синий','Зеленый','Желтый'];
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [notification, setNotification] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ 
    open: false, 
    message: '', 
    type: 'success' 
  });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      showNotification('Failed to load products', 'error');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      const categoryNames = data.map((category: any) => category.name);
      setAvailableCategories(categoryNames.sort());
    } catch (err) {
      showNotification('Failed to load categories', 'error');
    }
  };

  const handleOpen = (product?: any) => {
    if (product) {
      setEditingProduct({
        _id: product._id,
        name: product.name,
        price: product.price,
        description: product.description,
        images: product.images || [],
        videoUrl: product.videoUrl,
        categories: product.categories || [],
        sizes: product.sizes || [],
        colors: product.colors || []
      });
    } else {
      setEditingProduct({
        name: '',
        price: 0,
        description: '',
        images: [],
        videoUrl: '',
        categories: [],
        sizes: [],
        colors: []
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setEditingProduct(null);
    setOpen(false);
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ open: true, message, type });
  };

  const handleCategoryChange = (event: SelectChangeEvent<string[]>) => {
    const selectedCategories = event.target.value as string[];
    if (selectedCategories.includes('new-category')) {
      setEditingProduct(prev => ({
        ...prev!,
        categories: selectedCategories.filter(cat => cat !== 'new-category'),
        newCategorySelected: true
      }));
    } else {
      setEditingProduct(prev => ({
        ...prev!,
        categories: selectedCategories,
        newCategorySelected: false
      }));
    }
  };

  const handleNewCategoryAdd = (newCategoryName: string) => {
    if (newCategoryName.trim()) {
      setEditingProduct(prev => {
        const updatedCategories = [...(prev?.categories || []), newCategoryName];
        return {
          ...prev!,
          categories: updatedCategories,
          category: updatedCategories[0],
          newCategory: '',
          newCategorySelected: false
        };
      });
    }
  };

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const uploaded: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const csrfToken = getCsrfToken();
      const res = await fetch('/api/products/upload', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken || '' },
        body: formData
      });
      const data = await res.json();
      uploaded.push(data.url);
    }
    setEditingProduct(prev => prev ? { ...prev, images: [...(prev.images || []), ...uploaded] } : null);
  };

  const handleImageDelete = (idx: number) => {
    setEditingProduct(prev => prev ? { ...prev, images: prev.images.filter((_, i) => i !== idx) } : null);
  };

  const handleImagesDragEnd = (result: any) => {
    if (!result.destination) return;
    setEditingProduct(prev => {
      if (!prev) return prev;
      const imgs = Array.from(prev.images);
      const [removed] = imgs.splice(result.source.index, 1);
      imgs.splice(result.destination.index, 0, removed);
      return { ...prev, images: imgs };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProduct?.name || !editingProduct?.price || !editingProduct?.description || 
        !editingProduct?.images?.length || !(editingProduct?.categories && editingProduct.categories.length > 0) ||
        !(editingProduct?.sizes && editingProduct.sizes.length > 0) ||
        !(editingProduct?.colors && editingProduct.colors.length > 0)) {
      showNotification('Заполните все обязательные поля и добавьте хотя бы одно фото', 'error');
      return;
    }

    try {
      const finalData = {
        ...editingProduct,
        category: editingProduct.categories[0],
        sizes: editingProduct.sizes,
        colors: editingProduct.colors
      };

      const url = editingProduct._id 
        ? `${API_URL}/products/${editingProduct._id}`
        : `${API_URL}/products`;
      const csrfToken = getCsrfToken();
      const response = await fetch(url, {
        method: editingProduct._id ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify(finalData)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Server error creating/updating product:', errorData);
        const message = Array.isArray(errorData?.errors)
          ? errorData.errors.join(', ')
          : errorData?.message || 'Ошибка при сохранении товара';
        showNotification(message, 'error');
        return;
      }

      await fetchProducts();
      handleClose();
      showNotification(
        `Товар ${editingProduct._id ? 'обновлен' : 'создан'} успешно`, 
        'success'
      );
    } catch (err) {
      console.error('Error saving product:', err);
      showNotification(err instanceof Error ? err.message : 'Ошибка сохранения товара', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      await fetchProducts();
      showNotification('Product deleted successfully', 'success');
    } catch (err) {
      showNotification('Failed to delete product', 'error');
    }
  };

  const handleCategoryFilterChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedCategories(event.target.value as string[]);
  };

  const renderProductDialog = () => (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingProduct?._id ? 'Изменение товара' : 'Добавление нового товара'}
      </DialogTitle>
      <DialogContent>
        <Box component="form" noValidate sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Название"
            value={editingProduct?.name || ''}
            onChange={(e) => setEditingProduct(prev => prev ? { ...prev, name: e.target.value } : null)}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Цена"
            type="number"
            value={editingProduct?.price || ''}
            onChange={(e) => setEditingProduct(prev => prev ? { ...prev, price: Number(e.target.value) } : null)}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Описание"
            value={editingProduct?.description || ''}
            onChange={(e) => setEditingProduct(prev => prev ? { ...prev, description: e.target.value } : null)}
            margin="normal"
            required
          />
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle1">Фотографии товара</Typography>
            <Button variant="outlined" component="label" sx={{ mt: 1 }}>
              Загрузить фото
              <input type="file" hidden multiple accept="image/*" onChange={handleImagesUpload} />
            </Button>
            <DragDropContext onDragEnd={handleImagesDragEnd}>
              <Droppable droppableId="images-droppable" direction="horizontal">
                {provided => (
                  <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                    {editingProduct?.images?.map((img, idx) => (
                      <Draggable key={img} draggableId={img} index={idx}>
                        {providedDraggable => (
                          <Box ref={providedDraggable.innerRef} {...providedDraggable.draggableProps} {...providedDraggable.dragHandleProps} sx={{ position: 'relative' }}>
                            <img src={img} alt={`Фото ${idx + 1}`} style={{ width: 100, height: 100, objectFit: 'cover', border: idx === 0 ? '2px solid #1976d2' : '1px solid #ccc', borderRadius: 4 }} />
                            <Button size="small" color="error" sx={{ position: 'absolute', top: 2, right: 2, minWidth: 0, p: 0.5 }} onClick={() => handleImageDelete(idx)}>×</Button>
                            {idx === 0 && <Typography variant="caption" sx={{ position: 'absolute', left: 2, bottom: 2, bgcolor: 'white', px: 0.5, borderRadius: 1 }}>Главное</Typography>}
                          </Box>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </DragDropContext>
          </Box>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Категории</InputLabel>
            <Select
              multiple
              value={editingProduct?.categories || []}
              onChange={handleCategoryChange}
              input={<OutlinedInput label="Категории" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {availableCategories.map((category) => (
                <MenuItem key={category} value={category}>
                  <Checkbox checked={(editingProduct?.categories || []).indexOf(category) > -1} />
                  <ListItemText primary={category} />
                </MenuItem>
              ))}
              <MenuItem value="new-category">
                <ListItemText primary="+ Добавить новую категорию" />
              </MenuItem>
            </Select>
          </FormControl>

          {editingProduct?.newCategorySelected && (
            <Box sx={{ display: 'flex', mt: 2 }}>
              <TextField
                fullWidth
                label="Название новой категории"
                value={editingProduct?.newCategory || ''}
                onChange={(e) => setEditingProduct(prev => prev ? { ...prev, newCategory: e.target.value } : null)}
                required
              />
              <Button 
                variant="contained" 
                sx={{ ml: 1 }}
                onClick={() => handleNewCategoryAdd(editingProduct?.newCategory || '')}
              >
                Добавить
              </Button>
            </Box>
          )}

          <Autocomplete
            multiple
            freeSolo
            options={sizeOptions}
            value={editingProduct?.sizes || []}
            onChange={(_, v) => setEditingProduct(prev => prev ? { ...prev, sizes: v } : prev)}
            renderInput={(params) => (
              <TextField {...params} label="Размеры" margin="normal" />
            )}
          />
          <Autocomplete
            multiple
            freeSolo
            options={colorOptions}
            value={editingProduct?.colors || []}
            onChange={(_, v) => setEditingProduct(prev => prev ? { ...prev, colors: v } : prev)}
            renderInput={(params) => (
              <TextField {...params} label="Цвета" margin="normal" />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Отмена</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {editingProduct?._id ? 'Сохранить' : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderProductsTable = () => (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Фильтры
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Категории</InputLabel>
              <Select
                multiple
                value={selectedCategories}
                onChange={handleCategoryFilterChange}
                input={<OutlinedInput label="Категории" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                {availableCategories.map((category) => (
                  <MenuItem key={category} value={category}>
                    <Checkbox checked={selectedCategories.indexOf(category) > -1} />
                    <ListItemText primary={category} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', gap: 2 }}>
            <TextField
              label="Мин. цена"
              type="number"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
              fullWidth
            />
            <TextField
              label="Макс. цена"
              type="number"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
              fullWidth
            />
          </Box>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Изображение</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Категории</TableCell>
              <TableCell>Цена</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <AnimatePresence>
              {products.map((product) => (
                <TableRow
                  key={product._id}
                  component={motion.tr}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TableCell>
                    {product.images && product.images.length > 0 ? (
                      <Box component="img" src={product.images[0]} alt={product.name} sx={{ width: 50, height: 50, objectFit: 'cover' }} />
                    ) : (
                      <Box sx={{ width: 50, height: 50, bgcolor: '#eee', borderRadius: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {product.categories ? (
                        product.categories.map((cat, idx) => (
                          <Chip 
                            key={idx}
                            label={cat}
                            size="small"
                            variant="outlined"
                          />
                        ))
                      ) : (
                        <Chip 
                          label={product.category}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{Math.round(product.price)} ₽</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpen(product)} color="primary">
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(product._id)} color="error">
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Товары" />
        <Tab label="Категории" />
        <Tab label="Промо-акции" />
        <Tab label="Промокоды" />
      </Tabs>
      {tab === 0 && (
        <Box>
          <Button
            variant="contained"
            color="primary"
            sx={{ mb: 2 }}
            onClick={() => handleOpen()}
          >
            Добавить товар
          </Button>
          {renderProductsTable()}
          {renderProductDialog()}
        </Box>
      )}
      {tab === 1 && <CategoryManager />}
      {tab === 2 && <PromoManager />}
      {tab === 3 && <PromoCodeManager />}

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.type}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminPanel;
