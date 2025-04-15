import React, { useState, useEffect, useRef } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Button, 
  Badge, 
  Typography, 
  Box, 
  IconButton, 
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import { 
  ShoppingCart, 
  KeyboardArrowDown, 
  Category as CategoryIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { Category } from '../types/models';
import { CategoryService } from '../services/CategoryService';
import { API_URL } from '../config';
import SearchBar from './SearchBar';

const Navigation = () => {
  const navigate = useNavigate();
  const { cart } = useCart();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Загрузка категорий при монтировании компонента
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await CategoryService.fetchCategories();
        // Фильтруем только активные категории и сортируем по порядку
        const activeCategories = fetchedCategories
          .filter(category => category.isActive)
          .sort((a, b) => a.order - b.order);
        
        setCategories(activeCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Обработчики для меню категорий
  const handleOpenCatalogMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseCatalogMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/?category=${categoryId}`);
    handleCloseCatalogMenu();
  };

  return (
    <AppBar position="sticky" elevation={2}>
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 0, 
            cursor: 'pointer',
            fontWeight: 'bold',
            mr: 2
          }}
          onClick={() => navigate('/')}
        >
          Prostor-Shop
        </Typography>
        
        <Box sx={{ position: 'relative' }}>
          <Button 
            color="inherit"
            endIcon={<KeyboardArrowDown />}
            onClick={handleOpenCatalogMenu}
            startIcon={<CategoryIcon />}
          >
            Каталог
          </Button>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleCloseCatalogMenu}
            PaperProps={{
              elevation: 3,
              sx: { 
                mt: 1,
                width: 220,
                maxHeight: '70vh'
              }
            }}
          >
            <MenuItem onClick={() => {
              navigate('/');
              handleCloseCatalogMenu();
            }}>
              <ListItemText primary="Все товары" />
            </MenuItem>
            <Divider />
            {categories.map((category) => (
              <MenuItem 
                key={category._id}
                onClick={() => handleCategoryClick(category._id)}
              >
                <ListItemText primary={category.name} />
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <Box sx={{ flexGrow: 1, mx: 2, maxWidth: 600 }}>
          <SearchBar />
        </Box>

        <IconButton 
          color="inherit"
          onClick={() => navigate('/cart')}
        >
          <Badge badgeContent={cart?.items?.length || 0} color="secondary">
            <ShoppingCart />
          </Badge>
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
