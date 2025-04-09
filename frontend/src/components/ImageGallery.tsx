import { useState } from 'react';
import { Box, IconButton, Paper } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

interface ImageGalleryProps {
  mainImage: string;
  additionalImages?: string[];
}

const ImageGallery = ({ mainImage, additionalImages = [] }: ImageGalleryProps) => {
  const allImages = [mainImage, ...additionalImages];
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        component="img"
        src={allImages[currentIndex]}
        alt="Product"
        sx={{
          width: '100%',
          height: 400,
          objectFit: 'contain',
          borderRadius: 1
        }}
      />
      
      {allImages.length > 1 && (
        <>
          <IconButton
            sx={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'background.paper' },
            }}
            onClick={handlePrevious}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'background.paper' },
            }}
            onClick={handleNext}
          >
            <ChevronRight />
          </IconButton>

          <Box
            sx={{
              display: 'flex',
              gap: 1,
              mt: 2,
              overflowX: 'auto',
              pb: 1
            }}
          >
            {allImages.map((image, index) => (
              <Paper
                key={index}
                elevation={currentIndex === index ? 4 : 1}
                sx={{
                  cursor: 'pointer',
                  p: 0.5,
                  border: currentIndex === index ? 2 : 0,
                  borderColor: 'primary.main'
                }}
                onClick={() => setCurrentIndex(index)}
              >
                <Box
                  component="img"
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  sx={{
                    width: 60,
                    height: 60,
                    objectFit: 'cover',
                    borderRadius: 0.5
                  }}
                />
              </Paper>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default ImageGallery;