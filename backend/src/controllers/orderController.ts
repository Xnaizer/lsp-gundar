import { Request, Response } from 'express';
import { pool } from '../utils/database';
import { Order, OrderItem, Product } from '../types';

export class OrderController {
  // Membuat pesanan baru
  static async createOrder(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { customer_id, items, customer_name }: { 
        customer_id?: number; 
        items: OrderItem[];
        customer_name?: string;
      } = req.body;
      
      if (!items || items.length === 0) {
        res.status(400).json({ error: 'Items cannot be empty' });
        return;
      }

      // Handle guest customer
      let finalCustomerId = customer_id;
      if (!customer_id && customer_name) {
        const customerResult = await client.query(
          'INSERT INTO customers (name) VALUES (\$1) RETURNING id_customer',
          [customer_name]
        );
        finalCustomerId = customerResult.rows[0].id_customer;
      }

      // Validasi stok produk
      for (const item of items) {
        const productResult = await client.query(
          'SELECT stock, price, name FROM products WHERE id_product = \$1 AND is_active = true',
          [item.product_id]
        );
        
        if (productResult.rows.length === 0) {
          throw new Error(`Product with ID ${item.product_id} not found or inactive`);
        }
        
        const product: Product = productResult.rows[0];
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
        }
      }

      // Buat order
      const orderResult = await client.query(
        'INSERT INTO orders (customer_id, status, total_amount) VALUES (\$1, \$2, \$3) RETURNING *',
        [finalCustomerId, 'pending', 0]
      );
      
      const order: Order = orderResult.rows[0];
      let totalAmount = 0;

      // Tambah order items dan update stok
      for (const item of items) {
        const productResult = await client.query(
          'SELECT price, stock, name FROM products WHERE id_product = \$1',
          [item.product_id]
        );
        
        const product = productResult.rows[0];
        const price = parseFloat(product.price);
        const subtotal = price * item.quantity;
        totalAmount += subtotal;

        // Insert order item
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES (\$1, \$2, \$3, \$4, \$5)',
          [order.id_order, item.product_id, item.quantity, price, subtotal]
        );

        // Update stok produk
        const newStock = product.stock - item.quantity;
        await client.query(
          'UPDATE products SET stock = \$1, updated_at = CURRENT_TIMESTAMP WHERE id_product = \$2',
          [newStock, item.product_id]
        );

        // Catat history stok
        await client.query(
          'INSERT INTO stock_histories (product_id, change, reason, previous_stock, new_stock) VALUES (\$1, \$2, \$3, \$4, \$5)',
          [item.product_id, -item.quantity, `Order #${order.id_order}`, product.stock, newStock]
        );
      }

      // Update total amount
      await client.query(
        'UPDATE orders SET total_amount = \$1, updated_at = CURRENT_TIMESTAMP WHERE id_order = \$2',
        [totalAmount, order.id_order]
      );

      await client.query('COMMIT');
      
      res.status(201).json({
        ...order,
        total_amount: totalAmount,
        message: 'Order created successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating order:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      });
    } finally {
      client.release();
    }
  }

  // Mendapatkan detail pesanan dengan items
  static async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
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

      const itemsResult = await pool.query(
        `SELECT oi.*, p.name as product_name, cat.name as category_name 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id_product 
         LEFT JOIN categories cat ON p.category_id = cat.id_category 
         WHERE oi.order_id = \$1
         ORDER BY oi.id_order_item`,
        [id]
      );

      res.json({
        ...order,
        customer_name: order.customer_name || 'Guest',
        items: itemsResult.rows.map(item => ({
          ...item,
          price: parseFloat(item.price),
          subtotal: parseFloat(item.subtotal)
        }))
      });

    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Mendapatkan semua pesanan
  static async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      
      let query = `
        SELECT o.*, c.name as customer_name, c.phone as customer_phone,
               COUNT(oi.id_order_item) as items_count
        FROM orders o 
        LEFT JOIN customers c ON o.customer_id = c.id_customer
        LEFT JOIN order_items oi ON o.id_order = oi.order_id
      `;
      
      const params: any[] = [];
      
      if (status) {
        query += ' WHERE o.status = \$1';
        params.push(status);
      }
      
      query += ' GROUP BY o.id_order, c.name, c.phone';
      query += ' ORDER BY o.order_date DESC';
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      
      const orders = result.rows.map(order => ({
        ...order,
        customer_name: order.customer_name || 'Guest',
        total_amount: parseFloat(order.total_amount),
        items_count: parseInt(order.items_count)
      }));

      res.json(orders);

    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update order status
  static async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['pending', 'paid', 'cancelled'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const result = await pool.query(
        'UPDATE orders SET status = \$1, updated_at = CURRENT_TIMESTAMP WHERE id_order = \$2 RETURNING *',
        [status, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      res.json({
        message: 'Order status updated successfully',
        order: result.rows[0]
      });

    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}