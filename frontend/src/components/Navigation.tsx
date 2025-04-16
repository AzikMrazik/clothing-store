import React, { useState, useEffect } from 'react';
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
  Divider,
  ListItemText,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton as MuiIconButton
} from '@mui/material';
import { 
  ShoppingCart, 
  KeyboardArrowDown, 
  Category as CategoryIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { Category } from '../types/models';
import { CategoryService } from '../services/CategoryService';
import SearchBar from './SearchBar';

const Navigation = () => {
  const navigate = useNavigate();
  const { cart } = useCart();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);

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

  // Глобальный перехват script error для Telegram WebView
  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      // Проверяем только по userAgent, чтобы избежать ошибки типов
      if (navigator.userAgent.includes('Telegram')) {
        e.preventDefault();
        return false;
      }
    };
    window.addEventListener('error', handler, true);
    return () => window.removeEventListener('error', handler, true);
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

        {/* Поиск: на мобильном только иконка, на десктопе — строка */}
        <Box sx={{ flexGrow: 1, mx: 2, maxWidth: 600, display: isMobile ? 'none' : 'block' }}>
          <SearchBar />
        </Box>
        {isMobile && (
          <MuiIconButton color="inherit" onClick={() => setSearchDrawerOpen(true)} sx={{ ml: 'auto', mr: 1 }}>
            <SearchIcon />
          </MuiIconButton>
        )}
        <IconButton 
          color="inherit"
          onClick={() => navigate('/cart')}
          sx={{ ml: isMobile ? 0 : 2 }}
        >
          <Badge badgeContent={cart?.items?.length || 0} color="secondary">
            <ShoppingCart />
          </Badge>
        </IconButton>
        {/* Drawer для поиска на мобильном */}
        <Drawer anchor="top" open={searchDrawerOpen} onClose={() => setSearchDrawerOpen(false)}>
          <Box sx={{ p: 2 }}>
            <SearchBar />
          </Box>
        </Drawer>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
