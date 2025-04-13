import React, { useState } from 'react';
import { Box, IconButton, Dialog } from '@mui/material';
import { ChevronLeft, ChevronRight, ZoomIn } from '@mui/icons-material';

interface ImageGalleryProps {
  mainImage: string;
  additionalImages?: string[];
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ mainImage, additionalImages = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const allImages = [mainImage, ...additionalImages].filter(Boolean);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % allImages.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/placeholder-product.jpg';
  };

  return (
    <>
      {/* Main image container */}
      <Box sx={{ position: 'relative' }}>
        <Box 
          sx={{ 
            position: 'relative',
            width: '100%',
            height: { xs: '300px', sm: '400px', md: '500px' },
            bgcolor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden',
            cursor: 'pointer',
            '&:hover .zoom-icon': {
              opacity: 1
            }
          }}
          onClick={() => setOpen(true)}
        >
          <Box
            component="img"
            src={allImages[currentIndex]}
            alt="Product"
            onError={handleImageError}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transition: 'transform 0.3s ease'
            }}
          />
          <Box
            className="zoom-icon"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              bgcolor: 'rgba(255,255,255,0.8)',
              borderRadius: '50%',
              p: 1,
              opacity: 0,
              transition: 'opacity 0.3s ease'
            }}
          >
            <ZoomIn />
          </Box>
        </Box>

        {allImages.length > 1 && (
          <>
            <IconButton
              onClick={handlePrev}
              sx={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(255,255,255,0.8)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.9)'
                }
              }}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(255,255,255,0.8)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.9)'
                }
              }}
            >
              <ChevronRight />
            </IconButton>
          </>
        )}
      </Box>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mt: 2,
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}
        >
          {allImages.map((img, index) => (
            <Box
              key={index}
              onClick={() => setCurrentIndex(index)}
              sx={{
                width: 60,
                height: 60,
                borderRadius: 1,
                overflow: 'hidden',
                border: index === currentIndex ? '2px solid' : '1px solid',
                borderColor: index === currentIndex ? 'primary.main' : 'divider',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main'
                }
              }}
            >
              <Box
                component="img"
                src={img}
                alt={`Thumbnail ${index + 1}`}
                onError={handleImageError}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* Lightbox dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={false}
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: 'background.default',
            maxWidth: 'none',
            maxHeight: 'none',
            m: { xs: 1, sm: 2, md: 4 }
          }
        }}
      >
        <Box sx={{ position: 'relative', width: '90vw', height: '90vh' }}>
          <Box
            component="img"
            src={allImages[currentIndex]}
            alt="Product large view"
            onError={handleImageError}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
          {allImages.length > 1 && (
            <>
              <IconButton
                onClick={handlePrev}
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)'
                  }
                }}
              >
                <ChevronLeft />
              </IconButton>
              <IconButton
                onClick={handleNext}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)'
                  }
                }}
              >
                <ChevronRight />
              </IconButton>
            </>
          )}
        </Box>
      </Dialog>
    </>
  );
};

export default ImageGallery;