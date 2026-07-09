
import express from 'express';
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Hello World'
  });
});

export default router;
