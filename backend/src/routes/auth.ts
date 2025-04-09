import express from 'express';
import { config } from 'dotenv';

config();
const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && 
      password === process.env.ADMIN_PASSWORD) {
    res.json({ token: 'admin-token' });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

export default router;
