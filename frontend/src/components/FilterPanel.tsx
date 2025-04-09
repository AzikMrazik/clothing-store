import React from 'react';
import {
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Button,
  Slider,
  Typography
} from '@mui/material';
import { FilterList, Clear } from '@mui/icons-material';

interface FilterPanelProps {
  categories: string[];
  selectedCategory: string;
  priceRange: [number, number];
  maxPrice: number;
  searchQuery: string;
  onCategoryChange: (category: string) => void;
  onPriceChange: (range: [number, number]) => void;
  onSearchChange: (query: string) => void;
  onClear: () => void;
}

const FilterPanel = ({
  categories,
  selectedCategory,
  priceRange,
  maxPrice,
  searchQuery,
  onCategoryChange,
  onPriceChange,
  onSearchChange,
  onClear
}: FilterPanelProps) => {
  const handlePriceChange = (_event: Event, newValue: number | number[]) => {
    onPriceChange(newValue as [number, number]);
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <FilterList sx={{ mr: 1 }} />
        <Typography variant="h6">Фильтры</Typography>
        {(selectedCategory || searchQuery || priceRange[0] > 0 || priceRange[1] < maxPrice) && (
          <Button
            startIcon={<Clear />}
            onClick={onClear}
            size="small"
            sx={{ ml: 'auto' }}
          >
            Сбросить
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Категория</InputLabel>
          <Select
            value={selectedCategory}
            label="Категория"
            onChange={(e) => onCategoryChange(e.target.value)}
            size="small"
          >
            <MenuItem value="">Все категории</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Поиск"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        />

        <Box sx={{ width: '100%', mt: 2 }}>
          <Typography gutterBottom>
            Цена: {Math.round(priceRange[0])} ₽ - {Math.round(priceRange[1])} ₽
          </Typography>
          <Slider
            value={priceRange}
            onChange={handlePriceChange}
            valueLabelDisplay="auto"
            min={0}
            max={maxPrice}
            sx={{ mt: 1 }}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default FilterPanel;