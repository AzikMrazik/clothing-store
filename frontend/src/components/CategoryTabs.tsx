import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Tabs, 
  Tab,
  Typography,
  useTheme,
  useMediaQuery,
  IconButton,
  Container,
  Chip
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Category } from '../types/models';
import { CategoryService } from '../services/CategoryService';
import { useNotification } from '../contexts/NotificationContext';
import Loading from './Loading';

interface CategoryTabsProps {
  onCategoryChange: (category: string) => void;
  selectedCategory: string;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ onCategoryChange, selectedCategory }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const { showNotification } = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const tabsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // При изменении выбранной категории обновляем значение вкладки
    if (!selectedCategory) {
      setTabValue(0); // "Все" - первая вкладка
      return;
    }
    
    const index = categories.findIndex(cat => cat._id === selectedCategory);
    if (index !== -1) {
      setTabValue(index + 1); // +1 потому что первая вкладка - "Все"
    }
  }, [selectedCategory, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const fetchedCategories = await CategoryService.fetchCategories();
      // Сортируем категории по порядку и фильтруем только активные
      const activeCategories = fetchedCategories
        .filter(category => category.isActive)
        .sort((a, b) => a.order - b.order);
      
      setCategories(activeCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showNotification('Не удалось загрузить категории', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    if (newValue === 0) {
      onCategoryChange('');
    } else {
      onCategoryChange(categories[newValue - 1]._id);
    }
  };

  const handleScrollLeft = () => {
    if (tabsRef.current) {
      const newPosition = Math.max(0, scrollPosition - 200);
      setScrollPosition(newPosition);
      tabsRef.current.scrollLeft = newPosition;
    }
  };

  const handleScrollRight = () => {
    if (tabsRef.current) {
      const newPosition = scrollPosition + 200;
      setScrollPosition(newPosition);
      tabsRef.current.scrollLeft = newPosition;
    }
  };

  if (loading) {
    return <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><Loading size={30} /></Box>;
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ 
        width: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        mb: 2
      }}>
        {!isMobile && categories.length > 5 && (
          <IconButton 
            onClick={handleScrollLeft}
            sx={{ 
              position: 'absolute', 
              left: -20, 
              zIndex: 1,
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'grey.100',
              }
            }}
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
        )}

        <Box 
          ref={tabsRef}
          sx={{ 
            width: '100%',
            overflow: 'auto',
            display: 'flex',
            msOverflowStyle: 'none', // для IE и Edge
            scrollbarWidth: 'none', // для Firefox
            '&::-webkit-scrollbar': { // для Chrome, Safari и Opera
              display: 'none'
            },
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant={isTablet ? "scrollable" : "fullWidth"}
            scrollButtons={isTablet ? "auto" : false}
            allowScrollButtonsMobile
            textColor="primary"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': {
                minWidth: isMobile ? 'auto' : 120,
                px: isMobile ? 1 : 2,
                py: 1,
                fontWeight: 500,
              }
            }}
          >
            <Tab 
              label={
                <Chip 
                  label="Все" 
                  color={tabValue === 0 ? "primary" : "default"}
                  variant={tabValue === 0 ? "filled" : "outlined"}
                />
              }
            />
            
            {categories.map((category, index) => (
              <Tab 
                key={category._id}
                label={
                  <Chip 
                    label={category.name} 
                    color={tabValue === index + 1 ? "primary" : "default"}
                    variant={tabValue === index + 1 ? "filled" : "outlined"}
                  />
                }
              />
            ))}
          </Tabs>
        </Box>

        {!isMobile && categories.length > 5 && (
          <IconButton 
            onClick={handleScrollRight}
            sx={{ 
              position: 'absolute', 
              right: -20, 
              zIndex: 1,
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'grey.100',
              }
            }}
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Container>
  );
};

export default CategoryTabs;