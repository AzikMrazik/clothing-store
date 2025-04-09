import React, { useState, useEffect, useMemo } from 'react';
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
  Alert
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Add, Edit, Delete, Inventory } from '@mui/icons-material';

interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  additionalImages: string[];
  videoUrl?: string;
  category: string;
}

const AdminPanel = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product & { newCategory?: string }> | null>(null);
  const [notification, setNotification] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ 
    open: false, 
    message: '', 
    type: 'success' 
  });

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    return uniqueCategories.sort();
  }, [products]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      showNotification('Failed to load products', 'error');
    }
  };

  const handleOpen = (product?: Product) => {
    setEditingProduct(product || { 
      name: '',
      price: 0,
      description: '',
      imageUrl: '',
      additionalImages: [],
      videoUrl: '',
      category: ''
    });
    setOpen(true);
  };

  const handleClose = () => {
    setEditingProduct(null);
    setOpen(false);
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ open: true, message, type });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProduct?.name || !editingProduct?.price || !editingProduct?.description || 
        !editingProduct?.imageUrl || !(editingProduct?.category || editingProduct?.newCategory)) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    try {
      const isNewCategory = editingProduct.category === 'new-category';
      const finalData = {
        ...editingProduct,
        category: isNewCategory ? editingProduct.newCategory : editingProduct.category,
        additionalImages: editingProduct.additionalImages || []
      };

      const url = editingProduct._id 
        ? `http://localhost:3001/api/products/${editingProduct._id}`
        : 'http://localhost:3001/api/products';

      const response = await fetch(url, {
        method: editingProduct._id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save product');
      }

      await fetchProducts();
      handleClose();
      showNotification(
        `Product ${editingProduct._id ? 'updated' : 'created'} successfully`, 
        'success'
      );
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to save product', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/products/${id}`, {
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Manage Products</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
        >
          Add Product
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Actions</TableCell>
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
                  <TableCell>{product.category}</TableCell>
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

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProduct?._id ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" noValidate sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={editingProduct?.name || ''}
              onChange={(e) => setEditingProduct(prev => ({ ...prev!, name: e.target.value }))}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Price"
              type="number"
              value={editingProduct?.price || ''}
              onChange={(e) => setEditingProduct(prev => ({ ...prev!, price: Number(e.target.value) }))}
              margin="normal"
              required
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={4}
              value={editingProduct?.description || ''}
              onChange={(e) => setEditingProduct(prev => ({ ...prev!, description: e.target.value }))}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Main Image URL"
              value={editingProduct?.imageUrl || ''}
              onChange={(e) => setEditingProduct(prev => ({ ...prev!, imageUrl: e.target.value }))}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Additional Image URLs (one per line)"
              multiline
              rows={3}
              value={editingProduct?.additionalImages?.join('\n') || ''}
              onChange={(e) => setEditingProduct(prev => ({ 
                ...prev!, 
                additionalImages: e.target.value.split('\n').filter(url => url.trim())
              }))}
              margin="normal"
              helperText="Enter each image URL on a new line"
            />
            <TextField
              fullWidth
              label="Video URL (optional)"
              value={editingProduct?.videoUrl || ''}
              onChange={(e) => setEditingProduct(prev => ({ ...prev!, videoUrl: e.target.value }))}
              margin="normal"
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Category</InputLabel>
              <Select
                value={editingProduct?.category || ''}
                onChange={(e) => setEditingProduct(prev => ({ 
                  ...prev!, 
                  category: e.target.value,
                  newCategory: e.target.value === 'new-category' ? '' : prev?.newCategory
                }))}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
                <MenuItem value="new-category">+ Add New Category</MenuItem>
              </Select>
            </FormControl>
            {editingProduct?.category === 'new-category' && (
              <TextField
                fullWidth
                label="New Category Name"
                value={editingProduct?.newCategory || ''}
                onChange={(e) => setEditingProduct(prev => ({ ...prev!, newCategory: e.target.value }))}
                margin="normal"
                required
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingProduct?._id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.type}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminPanel;
