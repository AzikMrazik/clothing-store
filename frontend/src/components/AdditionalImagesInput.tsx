import React, { useState } from 'react';
import { TextField, Box, Button } from '@mui/material';

interface AdditionalImagesInputProps {
  onImagesChange: (images: string[]) => void;
}

const AdditionalImagesInput: React.FC<AdditionalImagesInputProps> = ({ onImagesChange }) => {
  const [images, setImages] = useState<string[]>(['']);

  const handleInputChange = (index: number, value: string) => {
    const updatedImages = [...images];
    updatedImages[index] = value;
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  const handleAddImage = () => {
    setImages([...images, '']);
  };

  const handleKeyPress = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' && images[index].trim() !== '') {
      event.preventDefault();
      handleAddImage();
    }
  };

  return (
    <Box>
      {images.map((image, index) => (
        <TextField
          key={index}
          label={`Image URL ${index + 1}`}
          value={image}
          onChange={(e) => handleInputChange(index, e.target.value)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          fullWidth
          margin="normal"
        />
      ))}
      <Button onClick={handleAddImage} variant="contained" color="primary">
        Add Image
      </Button>
    </Box>
  );
};

export default AdditionalImagesInput;