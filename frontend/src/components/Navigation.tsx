import { AppBar, Toolbar, Button, Badge, Typography, Box, IconButton } from '@mui/material';
import { ShoppingCart, Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

const Navigation = () => {
  const navigate = useNavigate();
  const { cart } = useCart();

  return (
    <AppBar position="sticky" elevation={2}>
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1, 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
          onClick={() => navigate('/')}
        >
          Prostor-Shop
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button 
            color="inherit"
            onClick={() => navigate('/')}
          >
            Каталог
          </Button>
          
          <IconButton 
            color="inherit"
            onClick={() => navigate('/cart')}
          >
            <Badge badgeContent={cart?.items?.length || 0} color="secondary">
              <ShoppingCart />
            </Badge>
          </IconButton>

          <IconButton 
            color="inherit"
            onClick={() => navigate('/admin')}
          >
            <Person />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
