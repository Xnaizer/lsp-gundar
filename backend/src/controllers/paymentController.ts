import { Request, Response } from 'express';
import { pool } from '../utils/database';
import { Payment } from '../types';

export class PaymentController {
  // Memproses pembayaran
  static async processPayment(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { order_id, method, amount, payment_ref }: Payment = req.body;
      
      if (!order_id || !method || !amount) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Validasi order
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id_order = \$1 AND status = \$2',
        [order_id, 'pending']
      );

      if (orderResult.rows.length === 0) {
        res.status(404).json({ error: 'Order not found or already processed' });
        return;
      }

      const order = orderResult.rows[0];

      // Validasi jumlah pembayaran
      if (amount < order.total_amount) {
        res.status(400).json({ 
          error: 'Insufficient payment amount',
          required: order.total_amount,
          received: amount
        });
        return;
      }

      // Validasi metode pembayaran non-cash harus ada payment_ref
      if (method === 'non-cash' && !payment_ref) {
        res.status(400).json({ error: 'Payment reference required for non-cash payment' });
        return;
      }

      // Insert payment
      const paymentResult = await client.query(
        'INSERT INTO payments (order_id, method, amount, payment_ref) VALUES (\$1, \$2, \$3, \$4) RETURNING *',
        [order_id, method, amount, payment_ref]
      );

      // Update order status
      await client.query(
        'UPDATE orders SET status = \$1 WHERE id_order = \$2',
        ['paid', order_id]
      );

      await client.query('COMMIT');

      const change = amount - order.total_amount;

      res.json({
        message: 'Payment processed successfully',
        payment: paymentResult.rows[0],
        order_total: order.total_amount,
        amount_paid: amount,
        change: change > 0 ? change : 0
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing payment:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  // Generate billing/tagihan
  static async generateBilling(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Get order details
      const orderResult = await pool.query(
        `SELECT o.*, c.name as customer_name, c.phone as customer_phone 
         FROM orders o 
         LEFT JOIN customers c ON o.customer_id = c.id_customer 
         WHERE o.id_order = $1`,
        [id]
      );

      if (orderResult.rows.length === 0) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      const order = orderResult.rows[0];

      // Get order items
      const itemsResult = await pool.query(
        `SELECT oi.*, p.name as product_name, cat.name as category_name 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id_product 
         JOIN categories cat ON p.category_id = cat.id_category 
         WHERE oi.order_id = $1`,
        [id]
      );

      // Get payment info if exists
      const paymentResult = await pool.query(
        'SELECT * FROM payments WHERE order_id = \$1',
        [id]
      );

      const billing = {
        order_info: {
          order_id: order.id_order,
          order_date: order.order_date,
          status: order.status,
          customer_name: order.customer_name || 'Guest',
          customer_phone: order.customer_phone
        },
        items: itemsResult.rows.map((item: any) => ({
          product_name: item.product_name,
          category: item.category_name,
          quantity: item.quantity,
          price: parseFloat(item.price),
          subtotal: parseFloat(item.subtotal)
        })),
        summary: {
          subtotal: parseFloat(order.total_amount),
          tax: 0, // Bisa ditambah jika ada pajak
          total: parseFloat(order.total_amount)
        },
        payment: paymentResult.rows.length > 0 ? {
          method: paymentResult.rows[0].method,
          amount: parseFloat(paymentResult.rows[0].amount),
          payment_date: paymentResult.rows[0].payment_date,
          payment_ref: paymentResult.rows[0].payment_ref,
          change: parseFloat(paymentResult.rows[0].amount) - parseFloat(order.total_amount)
        } : null
      };

      res.json(billing);

    } catch (error) {
      console.error('Error generating billing:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}