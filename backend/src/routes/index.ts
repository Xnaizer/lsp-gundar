import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { StockController } from '../controllers/stockController';
import { PaymentController } from '../controllers/paymentController';
import { pool } from '../utils/database';

const router = Router();

// Test route
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Categories routes
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Order routes
router.post('/orders', OrderController.createOrder);
router.get('/orders', OrderController.getAllOrders);
router.get('/orders/:id', OrderController.getOrderById);

// Stock routes
router.get('/products', StockController.getAllProducts);
router.post('/products', StockController.addProduct);
router.put('/products/:id/stock', StockController.updateStock);
router.get('/stock-history', StockController.getStockHistory);

// Payment routes
router.post('/payments', PaymentController.processPayment);
router.get('/orders/:id/billing', PaymentController.generateBilling);

// Reports routes
router.get('/reports/sales', async (req, res) => {
  try {
    const { period = 'weekly', start_date, end_date } = req.query;
    
    let dateCondition = '';
    const params: any[] = [];
    
    if (start_date && end_date) {
      dateCondition = 'WHERE o.order_date BETWEEN \$1 AND \$2';
      params.push(start_date, end_date);
    } else if (period === 'weekly') {
      dateCondition = 'WHERE o.order_date >= CURRENT_DATE - INTERVAL \'7 days\'';
    } else if (period === 'monthly') {
      dateCondition = 'WHERE o.order_date >= CURRENT_DATE - INTERVAL \'30 days\'';
    }

    const query = `
      SELECT 
        COUNT(o.id_order) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as average_order_value,
        COUNT(CASE WHEN o.status = 'paid' THEN 1 END) as paid_orders,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders
      FROM orders o
      ${dateCondition}
    `;

    const summaryResult = await pool.query(query, params);

    // Top selling products
    const topProductsQuery = `
      SELECT 
        p.name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.subtotal) as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id_product
      JOIN orders o ON oi.order_id = o.id_order
      ${dateCondition.replace('o.order_date', 'o.order_date')}
      GROUP BY p.id_product, p.name
      ORDER BY total_quantity DESC
      LIMIT 10
    `;

    const topProductsResult = await pool.query(topProductsQuery, params);

    res.json({
      period,
      summary: summaryResult.rows[0],
      top_products: topProductsResult.rows
    });

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;