import { Request, Response } from 'express';
import { pool } from '../utils/database';
import { Product, StockHistory } from '../types';

export class StockController {
  // Mendapatkan semua produk dengan stok
  static async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      const { category_id, low_stock, is_active = 'true', search } = req.query;
      
      let query = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id_category 
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (is_active !== 'all') {
        query += ` AND p.is_active = $${params.length + 1}`;
        params.push(is_active === 'true');
      }
      
      if (category_id) {
        query += ` AND p.category_id = $${params.length + 1}`;
        params.push(category_id);
      }
      
      if (low_stock) {
        const lowStockThreshold = parseInt(low_stock as string) || 10;
        query += ` AND p.stock <= $${params.length + 1}`;
        params.push(lowStockThreshold);
      }
      
      if (search) {
        query += ` AND (p.name ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
      }
      
      query += ' ORDER BY p.name';

      const result = await pool.query(query, params);
      
      const products = result.rows.map(product => ({
        ...product,
        price: parseFloat(product.price)
      }));

      res.json(products);

    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get product by ID
  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id_category 
         WHERE p.id_product = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const product = result.rows[0];
      res.json({
        ...product,
        price: parseFloat(product.price)
      });

    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Menambah produk baru
  static async addProduct(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { name, price, stock, category_id, is_active = true }: Product = req.body;
      
      if (!name || !price || typeof stock !== 'number' || !category_id) {
        res.status(400).json({ error: 'Missing required fields: name, price, stock, category_id' });
        return;
      }

      if (price < 0) {
        res.status(400).json({ error: 'Price must be non-negative' });
        return;
      }

      if (stock < 0) {
        res.status(400).json({ error: 'Stock must be non-negative' });
        return;
      }

      // Check if category exists
      const categoryCheck = await client.query(
        'SELECT id_category FROM categories WHERE id_category = \$1',
        [category_id]
      );

      if (categoryCheck.rows.length === 0) {
        res.status(400).json({ error: 'Category not found' });
        return;
      }

      // Check if product name already exists
      const nameCheck = await client.query(
        'SELECT id_product FROM products WHERE name = \$1',
        [name]
      );

      if (nameCheck.rows.length > 0) {
        res.status(400).json({ error: 'Product name already exists' });
        return;
      }

      const result = await client.query(
        'INSERT INTO products (name, price, stock, category_id, is_active) VALUES (\$1, \$2, \$3, \$4, \$5) RETURNING *',
        [name, price, stock, category_id, is_active]
      );

      const product = result.rows[0];

      // Record initial stock if stock > 0
      if (stock > 0) {
        await client.query(
          'INSERT INTO stock_histories (product_id, change, reason, previous_stock, new_stock) VALUES (\$1, \$2, \$3, \$4, \$5)',
          [product.id_product, stock, 'Initial stock', 0, stock]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Product added successfully',
        product: {
          ...product,
          price: parseFloat(product.price)
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding product:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  // Update product details
  static async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, price, category_id, is_active = true } = req.body;
      
      if (!name || !price || !category_id) {
        res.status(400).json({ error: 'Name, price, and category_id are required' });
        return;
      }

      if (price < 0) {
        res.status(400).json({ error: 'Price must be non-negative' });
        return;
      }

      // Check if category exists
      const categoryCheck = await pool.query(
        'SELECT id_category FROM categories WHERE id_category = \$1',
        [category_id]
      );

      if (categoryCheck.rows.length === 0) {
        res.status(400).json({ error: 'Category not found' });
        return;
      }

      // Check if product name already exists for other products
      const nameCheck = await pool.query(
        'SELECT id_product FROM products WHERE name = \$1 AND id_product != \$2',
        [name, id]
      );

      if (nameCheck.rows.length > 0) {
        res.status(400).json({ error: 'Product name already exists' });
        return;
      }

      const result = await pool.query(
        'UPDATE products SET name = \$1, price = \$2, category_id = \$3, is_active = \$4, updated_at = CURRENT_TIMESTAMP WHERE id_product = \$5 RETURNING *',
        [name, price, category_id, is_active, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json({
        message: 'Product updated successfully',
        product: {
          ...result.rows[0],
          price: parseFloat(result.rows[0].price)
        }
      });

    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update stok produk
  static async updateStock(req: Request, res: Response): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { stock, reason = 'Manual update' }: { stock: number; reason?: string } = req.body;
      
      if (typeof stock !== 'number' || stock < 0) {
        res.status(400).json({ error: 'Stock must be a non-negative number' });
        return;
      }

      // Get current stock
      const currentResult = await client.query(
        'SELECT stock, name FROM products WHERE id_product = \$1',
        [id]
      );

      if (currentResult.rows.length === 0) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const currentStock = currentResult.rows[0].stock;
      const productName = currentResult.rows[0].name;
      const change = stock - currentStock;

      // Update stock
      await client.query(
        'UPDATE products SET stock = \$1, updated_at = CURRENT_TIMESTAMP WHERE id_product = \$2',
        [stock, id]
      );

      // Record stock history
      await client.query(
        'INSERT INTO stock_histories (product_id, change, reason, previous_stock, new_stock) VALUES (\$1, \$2, \$3, \$4, \$5)',
        [id, change, reason, currentStock, stock]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Stock updated successfully',
        product_name: productName,
        old_stock: currentStock,
        new_stock: stock,
        change: change
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating stock:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  // Delete product (soft delete by setting is_active = false)
  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { force = false } = req.query;
      
      // Check if product is used in any orders
      const ordersCheck = await pool.query(
        'SELECT COUNT(*) as order_count FROM order_items WHERE product_id = \$1',
        [id]
      );

      const hasOrders = parseInt(ordersCheck.rows[0].order_count) > 0;

      if (hasOrders && !force) {
        // Soft delete - set as inactive
        const result = await pool.query(
          'UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id_product = \$1 RETURNING *',
          [id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Product not found' });
          return;
        }

        res.json({
          message: 'Product deactivated successfully (has order history)',
          product: {
            ...result.rows[0],
            price: parseFloat(result.rows[0].price)
          }
        });
      } else {
        // Hard delete if no order history or force delete
        const result = await pool.query(
          'DELETE FROM products WHERE id_product = \$1 RETURNING *',
          [id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Product not found' });
          return;
        }

        res.json({
          message: 'Product deleted successfully',
          product: {
            ...result.rows[0],
            price: parseFloat(result.rows[0].price)
          }
        });
      }

    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Mendapatkan history stok
  static async getStockHistory(req: Request, res: Response): Promise<void> {
    try {
      const { product_id, limit = 100, offset = 0 } = req.query;
      
      let query = `
        SELECT sh.*, p.name as product_name, c.name as category_name
        FROM stock_histories sh 
        JOIN products p ON sh.product_id = p.id_product
        LEFT JOIN categories c ON p.category_id = c.id_category
      `;
      
      const params: any[] = [];
      
      if (product_id) {
        query += ' WHERE sh.product_id = \$1';
        params.push(product_id);
      }
      
      query += ' ORDER BY sh.created_at DESC';
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      res.json(result.rows);

    } catch (error) {
      console.error('Error fetching stock history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get stock alerts (low stock products)
  static async getStockAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { threshold = 10 } = req.query;
      
      const query = `
        SELECT p.*, c.name as category_name,
        CASE 
          WHEN p.stock = 0 THEN 'OUT_OF_STOCK'
          WHEN p.stock <= 5 THEN 'CRITICAL'
          WHEN p.stock <= \$1 THEN 'LOW'
          ELSE 'OK'
        END as stock_status
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id_category
        WHERE p.is_active = true AND p.stock <= \$1
        ORDER BY p.stock ASC, p.name
      `;

      const result = await pool.query(query, [threshold]);
      
      const alerts = result.rows.map(product => ({
        ...product,
        price: parseFloat(product.price)
      }));

      res.json(alerts);

    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get stock statistics
  static async getStockStats(req: Request, res: Response): Promise<void> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_products,
          COUNT(CASE WHEN stock = 0 AND is_active = true THEN 1 END) as out_of_stock,
          COUNT(CASE WHEN stock <= 5 AND stock > 0 AND is_active = true THEN 1 END) as critical_stock,
          COUNT(CASE WHEN stock <= 10 AND stock > 5 AND is_active = true THEN 1 END) as low_stock,
          COALESCE(SUM(CASE WHEN is_active = true THEN stock * price ELSE 0 END), 0) as total_inventory_value
        FROM products
      `;

      const result = await pool.query(statsQuery);
      const stats = result.rows[0];

      res.json({
        total_products: parseInt(stats.total_products),
        active_products: parseInt(stats.active_products),
        inactive_products: parseInt(stats.inactive_products),
        out_of_stock: parseInt(stats.out_of_stock),
        critical_stock: parseInt(stats.critical_stock),
        low_stock: parseInt(stats.low_stock),
        total_inventory_value: parseFloat(stats.total_inventory_value)
      });

    } catch (error) {
      console.error('Error fetching stock stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}