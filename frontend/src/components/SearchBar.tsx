import { useState, useEffect } from 'react';
import {
  Autocomplete,
  Box,
  Typography,
  Avatar,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  name: string;
  type: 'product' | 'category';
  imageUrl?: string;
  price?: number;
}

const SearchBar = () => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!inputValue.trim()) {
      setOptions([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const productsResponse = await fetch(`${API_URL}/products?search=${encodeURIComponent(inputValue)}`);
        const categoriesResponse = await fetch(`${API_URL}/categories`);

        const [products, categories] = await Promise.all([
          productsResponse.json(),
          categoriesResponse.json()
        ]);

        // Фильтруем продукты по поисковому запросу
        const filteredProducts = products
          .filter((product: any) => 
            product.name.toLowerCase().includes(inputValue.toLowerCase()) ||
            product.description.toLowerCase().includes(inputValue.toLowerCase())
          )
          .map((product: any) => ({
            id: product._id,
            name: product.name,
            type: 'product' as const,
            imageUrl: product.imageUrl,
            price: product.price
          }));

        // Фильтруем категории по поисковому запросу
        const filteredCategories = categories
          .filter((category: any) => 
            category.name.toLowerCase().includes(inputValue.toLowerCase())
          )
          .map((category: any) => ({
            id: category._id,
            name: category.name,
            type: 'category' as const,
            imageUrl: category.imageUrl
          }));

        setOptions([...filteredProducts, ...filteredCategories]);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [inputValue]);

  const handleOptionSelect = (_: any, option: SearchResult | null) => {
    if (!option) return;

    if (option.type === 'product') {
      navigate(`/product/${option.id}`);
    } else {
      navigate(`/?category=${option.id}`);
    }
    setInputValue('');
  };

  return (
    <Autocomplete
      id="search-autocomplete"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      groupBy={(option) => option.type === 'product' ? 'Товары' : 'Категории'}
      getOptionLabel={(option) => option.name}
      filterOptions={(x) => x}
      loading={loading}
      value={null}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      onChange={handleOptionSelect}
      noOptionsText="Ничего не найдено"
      loadingText="Поиск..."
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Поиск товаров и категорий..."
          variant="outlined"
          fullWidth
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
            {option.imageUrl && (
              <Avatar
                src={option.imageUrl}
                alt={option.name}
                variant="rounded"
                sx={{ width: 40, height: 40 }}
              />
            )}
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body1">{option.name}</Typography>
              {option.type === 'product' && option.price && (
                <Typography variant="body2" color="text.secondary">
                  {Math.round(option.price)} ₽
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {option.type === 'product' ? 'Товар' : 'Категория'}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    />
  );
};

export default SearchBar;