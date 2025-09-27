import { Request, Response } from 'express';
import { pool } from '../utils/database';
import { Payment } from '../types';

export class PaymentController {
  // Get all payments
  static async getAllPayments(req: Request, res: Response): Promise<void> {
    try {
      const { order_id, method, limit = 100, offset = 0, start_date, end_date } = req.query;
      
      let query = `
        SELECT p.*, o.total_amount as order_total, c.name as customer_name, c.phone as customer_phone,
               o.status as order_status, o.order_date
        FROM payments p
        JOIN orders o ON p.order_id = o.id_order
        LEFT JOIN customers c ON o.customer_id = c.id_customer
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];
      
      if (order_id) {
        conditions.push(`p.order_id = $${params.length + 1}`);
        params.push(order_id);
      }
      
      if (method) {
        conditions.push(`p.method = $${params.length + 1}`);
        params.push(method);
      }
      
      if (start_date && end_date) {
        conditions.push(`p.payment_date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
        params.push(start_date, end_date);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ` ORDER BY p.payment_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      
      const payments = result.rows.map(payment => ({
        ...payment,
        amount: parseFloat(payment.amount),
        order_total: parseFloat(payment.order_total),
        customer_name: payment.customer_name || 'Guest',
        change: parseFloat(payment.amount) - parseFloat(payment.order_total)
      }));

      res.json(payments);

    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get payment by ID
  static async getPaymentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT p.*, o.total_amount as order_total, c.name as customer_name, c.phone as customer_phone,
                o.status as order_status, o.order_date
         FROM payments p
         JOIN orders o ON p.order_id = o.id_order
         LEFT JOIN customers c ON o.customer_id = c.id_customer
         WHERE p.id_payment = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      const payment = result.rows[0];
      res.json({
        ...payment,
        amount: parseFloat(payment.amount),
        order_total: parseFloat(payment.order_total),
        customer_name: payment.customer_name || 'Guest',
        change: parseFloat(payment.amount) - parseFloat(payment.order_total)
      });

    } catch (error) {
      console.error('Error fetching payment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Memproses pembayaran
  static async processPayment(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { order_id, method, amount, payment_ref, notes }: Payment & { notes?: string } = req.body;
      
      if (!order_id || !method || !amount) {
        res.status(400).json({ error: 'Missing required fields: order_id, method, amount' });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({ error: 'Amount must be greater than 0' });
        return;
      }

      // Validasi order
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id_order = \$1',
        [order_id]
      );

      if (orderResult.rows.length === 0) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      const order = orderResult.rows[0];

      if (order.status === 'paid') {
        res.status(400).json({ error: 'Order is already paid' });
        return;
      }

      if (order.status === 'cancelled') {
        res.status(400).json({ error: 'Cannot process payment for cancelled order' });
        return;
      }

      // Check if payment already exists for this order
      const existingPayment = await client.query(
        'SELECT id_payment FROM payments WHERE order_id = \$1',
        [order_id]
      );

      if (existingPayment.rows.length > 0) {
        res.status(400).json({ error: 'Payment already exists for this order' });
        return;
      }

      // Validasi jumlah pembayaran
      const orderTotal = parseFloat(order.total_amount);
      if (amount < orderTotal) {
        res.status(400).json({ 
          error: 'Insufficient payment amount',
          required: orderTotal,
          received: amount,
          shortage: orderTotal - amount
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
        'INSERT INTO payments (order_id, method, amount, payment_ref, notes) VALUES (\$1, \$2, \$3, \$4, \$5) RETURNING *',
        [order_id, method, amount, payment_ref, notes]
      );

      // Update order status
      await client.query(
        'UPDATE orders SET status = \$1, updated_at = CURRENT_TIMESTAMP WHERE id_order = \$2',
        ['paid', order_id]
      );

      await client.query('COMMIT');

      const change = amount - orderTotal;

      res.json({
        message: 'Payment processed successfully',
        payment: {
          ...paymentResult.rows[0],
          amount: parseFloat(paymentResult.rows[0].amount)
        },
        order_total: orderTotal,
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

  // Update payment
  static async updatePayment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { method, amount, payment_ref, notes } = req.body;
      
      if (!method || !amount) {
        res.status(400).json({ error: 'Method and amount are required' });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({ error: 'Amount must be greater than 0' });
        return;
      }

      // Validasi metode pembayaran non-cash harus ada payment_ref
      if (method === 'non-cash' && !payment_ref) {
        res.status(400).json({ error: 'Payment reference required for non-cash payment' });
        return;
      }

      const result = await pool.query(
        'UPDATE payments SET method = \$1, amount = \$2, payment_ref = \$3, notes = \$4 WHERE id_payment = \$5 RETURNING *',
        [method, amount, payment_ref, notes, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      res.json({
        message: 'Payment updated successfully',
        payment: {
          ...result.rows[0],
          amount: parseFloat(result.rows[0].amount)
        }
      });

    } catch (error) {
      console.error('Error updating payment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete payment
  static async deletePayment(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      
      // Get payment info
      const paymentResult = await client.query(
        'SELECT * FROM payments WHERE id_payment = \$1',
        [id]
      );

      if (paymentResult.rows.length === 0) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      const payment = paymentResult.rows[0];

      // Delete payment
      await client.query(
        'DELETE FROM payments WHERE id_payment = \$1',
        [id]
      );

      // Update order status back to pending
      await client.query(
        'UPDATE orders SET status = \$1, updated_at = CURRENT_TIMESTAMP WHERE id_order = \$2',
        ['pending', payment.order_id]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Payment deleted successfully',
        payment: {
          ...payment,
          amount: parseFloat(payment.amount)
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting payment:', error);
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
        `SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
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
         LEFT JOIN categories cat ON p.category_id = cat.id_category 
         WHERE oi.order_id = \$1
         ORDER BY oi.id_order_item`,
        [id]
      );

      // Get payment info if exists
      const paymentResult = await pool.query(
        'SELECT * FROM payments WHERE order_id = \$1',
        [id]
      );

      // Calculate totals
      const subtotal = parseFloat(order.total_amount);
      const tax = 0; // Bisa ditambah jika ada pajak
      const service_charge = 0; // Bisa ditambah jika ada service charge
      const total = subtotal + tax + service_charge;

      const billing = {
        order_info: {
          order_id: order.id_order,
          order_date: order.order_date,
          status: order.status,
          customer_name: order.customer_name || 'Guest',
          customer_phone: order.customer_phone,
          customer_email: order.customer_email,
          notes: order.notes
        },
        items: itemsResult.rows.map((item: any) => ({
          id_order_item: item.id_order_item,
          product_name: item.product_name,
          category: item.category_name,
          quantity: item.quantity,
          price: parseFloat(item.price),
          subtotal: parseFloat(item.subtotal)
        })),
        summary: {
          subtotal: subtotal,
          tax: tax,
          service_charge: service_charge,
          total: total,
          items_count: itemsResult.rows.length
        },
        payment: paymentResult.rows.length > 0 ? {
          id_payment: paymentResult.rows[0].id_payment,
          method: paymentResult.rows[0].method,
          amount: parseFloat(paymentResult.rows[0].amount),
          payment_date: paymentResult.rows[0].payment_date,
          payment_ref: paymentResult.rows[0].payment_ref,
          change: parseFloat(paymentResult.rows[0].amount) - total,
          notes: paymentResult.rows[0].notes
        } : null,
        generated_at: new Date().toISOString()
      };

      res.json(billing);

    } catch (error) {
      console.error('Error generating billing:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get payment statistics
  static async getPaymentStats(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'daily' } = req.query;
      
      let dateCondition = '';
      if (period === 'daily') {
        dateCondition = 'WHERE p.payment_date >= CURRENT_DATE';
      } else if (period === 'weekly') {
        dateCondition = 'WHERE p.payment_date >= CURRENT_DATE - INTERVAL \'7 days\'';
      } else if (period === 'monthly') {
        dateCondition = 'WHERE p.payment_date >= CURRENT_DATE - INTERVAL \'30 days\'';
      }

      const statsQuery = `
        SELECT 
          COUNT(*) as total_payments,
          COUNT(CASE WHEN method = 'cash' THEN 1 END) as cash_payments,
          COUNT(CASE WHEN method = 'non-cash' THEN 1 END) as non_cash_payments,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN method = 'cash' THEN amount ELSE 0 END), 0) as cash_amount,
          COALESCE(SUM(CASE WHEN method = 'non-cash' THEN amount ELSE 0 END), 0) as non_cash_amount,
          COALESCE(AVG(amount), 0) as average_payment
        FROM payments p
        ${dateCondition}
      `;

      const result = await pool.query(statsQuery);
      const stats = result.rows[0];

      res.json({
        period,
        total_payments: parseInt(stats.total_payments),
        cash_payments: parseInt(stats.cash_payments),
        non_cash_payments: parseInt(stats.non_cash_payments),
        total_amount: parseFloat(stats.total_amount),
        cash_amount: parseFloat(stats.cash_amount),
        non_cash_amount: parseFloat(stats.non_cash_amount),
        average_payment: parseFloat(stats.average_payment)
      });

    } catch (error) {
      console.error('Error fetching payment stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Refund payment
  static async refundPayment(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { reason = 'Customer refund request', refund_amount } = req.body;
      
      // Get payment info
      const paymentResult = await client.query(
        `SELECT p.*, o.total_amount as order_total, o.status as order_status
         FROM payments p
         JOIN orders o ON p.order_id = o.id_order
         WHERE p.id_payment = $1`,
        [id]
      );

      if (paymentResult.rows.length === 0) {
        res.status(404).json({ error: 'Payment not found' });
        return;
      }

      const payment = paymentResult.rows[0];
      const paymentAmount = parseFloat(payment.amount);
      const finalRefundAmount = refund_amount || paymentAmount;

      if (finalRefundAmount > paymentAmount) {
        res.status(400).json({ error: 'Refund amount cannot exceed payment amount' });
        return;
      }

      // Create refund record (you might want to create a refunds table)
      // For now, we'll just update the payment with refund info
      await client.query(
        'UPDATE payments SET notes = \$1 WHERE id_payment = \$2',
        [`REFUNDED: ${reason}. Amount: ${finalRefundAmount}`, id]
      );

      // Update order status to cancelled
      await client.query(
        'UPDATE orders SET status = \$1, notes = \$2, updated_at = CURRENT_TIMESTAMP WHERE id_order = \$3',
        ['cancelled', `Refunded: ${reason}`, payment.order_id]
      );

      // Restore stock for cancelled order
      const orderItems = await client.query(
        'SELECT * FROM order_items WHERE order_id = \$1',
        [payment.order_id]
      );

      for (const item of orderItems.rows) {
        // Restore stock
        const productResult = await client.query(
          'SELECT stock, name FROM products WHERE id_product = \$1',
          [item.product_id]
        );

        if (productResult.rows.length > 0) {
          const product = productResult.rows[0];
          const newStock = product.stock + item.quantity;

          await client.query(
            'UPDATE products SET stock = \$1, updated_at = CURRENT_TIMESTAMP WHERE id_product = \$2',
            [newStock, item.product_id]
          );

          // Record stock history
          await client.query(
            'INSERT INTO stock_histories (product_id, change, reason, previous_stock, new_stock) VALUES (\$1, \$2, \$3, \$4, \$5)',
            [item.product_id, item.quantity, `Refund - Order #${payment.order_id}`, product.stock, newStock]
          );
        }
      }

      await client.query('COMMIT');

      res.json({
        message: 'Payment refunded successfully',
        refund_amount: finalRefundAmount,
        original_amount: paymentAmount,
        reason: reason
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing refund:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }
}