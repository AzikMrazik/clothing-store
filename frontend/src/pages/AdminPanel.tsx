import React, { useState, useEffect, useRef } from 'react';
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
  SelectChangeEvent
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Add, Edit, Delete } from '@mui/icons-material';
import { API_URL } from '../config';

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
}

const AdminPanel = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product & { newCategory?: string; newCategorySelected?: boolean }> | null>(null);
  const [notification, setNotification] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ 
    open: false, 
    message: '', 
    type: 'success' 
  });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleOpen = (product?: Product) => {
    if (product) {
      setEditingProduct({
        ...product,
        categories: product.categories || [product.category]
      });
    } else {
      setEditingProduct({
        name: '',
        price: 0,
        description: '',
        imageUrl: '',
        additionalImages: [],
        videoUrl: '',
        category: '',
        categories: []
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/products/upload', { method: 'POST', body: formData });
    const data = await res.json();
    setEditingProduct(prev => ({ ...prev!, imageUrl: data.url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProduct?.name || !editingProduct?.price || !editingProduct?.description || 
        !editingProduct?.imageUrl || 
        !(editingProduct?.categories && editingProduct?.categories.length > 0)) {
      showNotification('Please fill in all required fields and select at least one category', 'error');
      return;
    }

    try {
      const finalData = {
        ...editingProduct,
        category: editingProduct.categories[0],
        additionalImages: editingProduct.additionalImages || []
      };

      const url = editingProduct._id 
        ? `${API_URL}/products/${editingProduct._id}`
        : `${API_URL}/products`;

      const response = await fetch(url, {
        method: editingProduct._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const responseText = await response.text();
            if (responseText) {
              const error = JSON.parse(responseText);
              throw new Error(error.message || 'Failed to save product');
            } else {
              throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
          } catch (jsonError) {
            console.error('Error parsing response:', jsonError);
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      await fetchProducts();
      handleClose();
      showNotification(
        `Product ${editingProduct._id ? 'updated' : 'created'} successfully`, 
        'success'
      );
    } catch (err) {
      console.error('Error saving product:', err);
      showNotification(err instanceof Error ? err.message : 'Failed to save product', 'error');
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
            onChange={(e) => setEditingProduct(prev => ({ ...prev!, name: e.target.value }))}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Цена"
            type="number"
            value={editingProduct?.price || ''}
            onChange={(e) => setEditingProduct(prev => ({ ...prev!, price: Number(e.target.value) }))}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Описание"
            value={editingProduct?.description || ''}
            onChange={(e) => setEditingProduct(prev => ({ ...prev!, description: e.target.value }))}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="URL изображения"
            value={editingProduct?.imageUrl || ''}
            onChange={(e) => setEditingProduct(prev => ({ ...prev!, imageUrl: e.target.value }))}
            margin="normal"
            required
          />
          <Button variant="outlined" component="label" sx={{ mt: 1 }}>
            Загрузить изображение
            <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleImageUpload} />
          </Button>
          {editingProduct?.imageUrl && (
            <Box sx={{ mt: 1 }}>
              <img src={editingProduct.imageUrl} alt="preview" style={{ maxWidth: 200, maxHeight: 120 }} />
            </Box>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Дополнительные изображения"
            value={(editingProduct?.additionalImages || []).join('\n')}
            onChange={(e) => {
              const links = e.target.value
                .split('\n')
                .map(link => link.trim())
                .filter(link => link.length > 0);
              setEditingProduct(prev => ({ ...prev!, additionalImages: links }));
            }}
            margin="normal"
            helperText="Добавьте ссылки на дополнительные изображения, по одной на строку"
          />
          
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
                onChange={(e) => setEditingProduct(prev => ({ ...prev!, newCategory: e.target.value }))}
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
                    <Box
                      component="img"
                      src={product.imageUrl}
                      alt={product.name}
                      sx={{ width: 50, height: 50, objectFit: 'cover' }}
                    />
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
      <Box sx={{ mb: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Управление товарами</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpen()}
          >
            Добавить товар
          </Button>
        </Box>

        {renderProductsTable()}
      </Box>

      {renderProductDialog()}

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
