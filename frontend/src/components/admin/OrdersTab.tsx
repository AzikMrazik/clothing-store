import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  DialogActions,
  Button,
  Divider,
  Grid
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';
import { useNotification } from '../../contexts/NotificationContext';
import Loading from '../Loading';
import { API_URL } from '../../config';

interface Order {
  _id: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
  };
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

const statusColors = {
  pending: 'warning',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error'
} as const;

const statusLabels = {
  pending: 'Ожидает',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён'
};

const OrdersTab = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { call } = useApi();
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const result = await call(
      async () => {
        const response = await fetch(`${API_URL}/orders`);
        if (!response.ok) throw new Error('Failed to fetch orders');
        return response.json();
      },
      { errorMessage: 'Failed to load orders' }
    );

    if (result?.data) {
      setOrders(result.data);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const result = await call(
      async () => {
        const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) throw new Error('Failed to update order status');
        return response.json();
      },
      { errorMessage: 'Failed to update order status' }
    );

    if (result?.data) {
      setOrders(orders.map(order => 
        order._id === orderId ? { ...order, status: newStatus as Order['status'] } : order
      ));
      showNotification('Статус заказа обновлен', 'success');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!orders.length) {
    return <Loading />;
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID заказа</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Клиент</TableCell>
              <TableCell>Сумма</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order._id}>
                <TableCell>{order._id.slice(-6)}</TableCell>
                <TableCell>{formatDate(order.createdAt)}</TableCell>
                <TableCell>
                  {`${order.customerInfo.firstName} ${order.customerInfo.lastName}`}
                </TableCell>
                <TableCell>{Math.round(order.total)} ₽</TableCell>
                <TableCell>
                  <FormControl size="small">
                    <Select
                      value={order.status}
                      onChange={(e: SelectChangeEvent) => 
                        handleStatusChange(order._id, e.target.value)
                      }
                      renderValue={(status) => (
                        <Chip
                          label={statusLabels[status as keyof typeof statusLabels]}
                          size="small"
                          color={statusColors[status as keyof typeof statusColors]}
                        />
                      )}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell align="right">
                  <IconButton 
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsDetailsOpen(true);
                    }}
                  >
                    <Visibility />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Детали заказа #{selectedOrder?._id.slice(-6)}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Информация о клиенте
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="ФИО"
                      secondary={`${selectedOrder.customerInfo.firstName} ${selectedOrder.customerInfo.lastName}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Email"
                      secondary={selectedOrder.customerInfo.email}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Телефон"
                      secondary={selectedOrder.customerInfo.phone}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Адрес доставки"
                      secondary={`${selectedOrder.customerInfo.address}, ${selectedOrder.customerInfo.city}, ${selectedOrder.customerInfo.zipCode}`}
                    />
                  </ListItem>
                </List>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Товары
              </Typography>
              <List dense>
                {selectedOrder.items.map((item, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.quantity} шт. × ₽${item.price}`}
                    />
                    <Typography>
                      {Math.round(item.quantity * item.price)} ₽
                    </Typography>
                  </ListItem>
                ))}
              </List>

              <Box sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: 'background.default',
                borderRadius: 1
              }}>
                <Typography variant="h6">
                  Итого: {Math.round(selectedOrder.total)} ₽
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDetailsOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OrdersTab;