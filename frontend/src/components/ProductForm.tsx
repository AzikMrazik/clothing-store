import React, { useState, FormEvent, ChangeEvent } from 'react';
import { TextField, Button, Box, Theme } from '@mui/material';
import Grid from '@mui/material/Grid';
import { SxProps } from '@mui/system';
import { GridProps } from '@mui/material/Grid';

interface GridItemProps extends Omit<GridProps, 'item' | 'xs'> {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

const GridItem = ({ children, sx, ...props }: GridItemProps) => (
  <Grid component="div" {...props} item xs={12} sx={sx}>
    {children}
  </Grid>
);

interface ProductFormProps {
  onSubmit?: (data: ProductFormData) => void;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  images: string[];
}

const ProductForm = ({ onSubmit }: ProductFormProps) => {
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        name: productName,
        description: productDescription,
        price: productPrice,
        images
      });
    }
  };

  // Улучшенный обработчик для изображений, с правильной поддержкой Enter
  const handleImagesChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    // Разделяем строки только по переводам строк
    const urls = text
      .split(/\n/)
      .map(url => url.trim())
      .filter(url => url.length > 0);
    setImages(urls);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        <GridItem>
          <TextField
            fullWidth
            label="Название продукта"
            value={productName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setProductName(e.target.value)}
            required
          />
        </GridItem>
        <GridItem>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Описание продукта"
            value={productDescription}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setProductDescription(e.target.value)}
            required
          />
        </GridItem>
        <GridItem>
          <TextField
            fullWidth
            type="number"
            label="Цена продукта"
            value={productPrice}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setProductPrice(e.target.value)}
            required
            inputProps={{ min: 0, step: 0.01 }}
          />
        </GridItem>
        <GridItem>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Изображения продукта"
            placeholder="Вставьте URL изображений, по одному на строку"
            value={images.join('\n')}
            onChange={handleImagesChange}
            sx={{
              '.MuiInputBase-root': {
                height: 'auto',
                minHeight: '100px'
              }
            }}
            helperText="Вы можете добавить несколько URL изображений, разделяя их нажатием клавиши Enter (по одному URL на строку)"
          />
        </GridItem>
        <GridItem>
          <Button type="submit" variant="contained" color="primary">
            Сохранить
          </Button>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default ProductForm;