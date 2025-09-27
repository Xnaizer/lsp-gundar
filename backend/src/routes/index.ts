import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { StockController } from '../controllers/stockController';
import { PaymentController } from '../controllers/paymentController';
import { CustomerController } from '../controllers/customerController';
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
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO categories (name) VALUES (\$1) RETURNING *',
      [name]
    );

    res.status(201).json({
      message: 'Category created successfully',
      category: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer routes
router.get('/customers', CustomerController.getAllCustomers);
router.get('/customers/:id', CustomerController.getCustomerById);
router.post('/customers', CustomerController.createCustomer);
router.put('/customers/:id', CustomerController.updateCustomer);
router.delete('/customers/:id', CustomerController.deleteCustomer);

// Order routes
router.post('/orders', OrderController.createOrder);
router.get('/orders', OrderController.getAllOrders);
router.get('/orders/:id', OrderController.getOrderById);
router.put('/orders/:id/status', OrderController.updateOrderStatus);
router.delete('/orders/:id', OrderController.deleteOrder);

// Product/Stock routes
router.get('/products', StockController.getAllProducts);
router.get('/products/:id', StockController.getProductById);
router.post('/products', StockController.addProduct);
router.put('/products/:id', StockController.updateProduct);
router.put('/products/:id/stock', StockController.updateStock);
router.delete('/products/:id', StockController.deleteProduct);
router.get('/stock-history', StockController.getStockHistory);

// Payment routes
router.get('/payments', PaymentController.getAllPayments);
router.get('/payments/:id', PaymentController.getPaymentById);
router.post('/payments', PaymentController.processPayment);
router.get('/orders/:id/billing', PaymentController.generateBilling);

// Reports routes (existing code)
router.get('/reports/sales', async (req, res) => {
  try {
    const { period = 'weekly', start_date, end_date } = req.query;
    
    let dateCondition = '';
    const params: any[] = [];
    
    if (start_date && end_date) {
      dateCondition = 'WHERE o.order_date BETWEEN \$1 AND \$2 AND o.status != \'cancelled\'';
      params.push(start_date, end_date);
    } else if (period === 'weekly') {
      dateCondition = 'WHERE o.order_date >= CURRENT_DATE - INTERVAL \'7 days\' AND o.status != \'cancelled\'';
    } else if (period === 'monthly') {
      dateCondition = 'WHERE o.order_date >= CURRENT_DATE - INTERVAL \'30 days\' AND o.status != \'cancelled\'';
    } else {
      dateCondition = 'WHERE o.status != \'cancelled\'';
    }

    const query = `
      SELECT 
        COUNT(o.id_order) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(AVG(o.total_amount), 0) as average_order_value,
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

    const summary = summaryResult.rows[0];
    res.json({
      period: start_date && end_date ? 'custom' : period,
      summary: {
        total_orders: parseInt(summary.total_orders),
        total_revenue: parseFloat(summary.total_revenue),
        average_order_value: parseFloat(summary.average_order_value),
        paid_orders: parseInt(summary.paid_orders),
        pending_orders: parseInt(summary.pending_orders)
      },
      top_products: topProductsResult.rows.map(product => ({
        name: product.name,
        total_quantity: parseInt(product.total_quantity),
        total_revenue: parseFloat(product.total_revenue)
      }))
    });

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;