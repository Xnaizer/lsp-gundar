import { Request, Response } from 'express';
import { pool } from '../utils/database';
import { Product, StockHistory } from '../types';

export class StockController {
  // Mendapatkan semua produk dengan stok
  static async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      const { category_id, low_stock } = req.query;
      
      let query = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        JOIN categories c ON p.category_id = c.id_category 
        WHERE p.is_active = true
      `;
      
      const params: any[] = [];
      
      if (category_id) {
        query += ' AND p.category_id = \$1';
        params.push(category_id);
      }
      
      if (low_stock) {
        const lowStockThreshold = parseInt(low_stock as string) || 10;
        query += ` AND p.stock <= $${params.length + 1}`;
        params.push(lowStockThreshold);
      }
      
      query += ' ORDER BY p.name';

      const result = await pool.query(query, params);
      res.json(result.rows);

    } catch (error) {
      console.error('Error fetching products:', error);
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
        'UPDATE products SET stock = \$1 WHERE id_product = \$2',
        [stock, id]
      );

      // Record stock history
      await client.query(
        'INSERT INTO stock_histories (product_id, change, reason) VALUES (\$1, \$2, \$3)',
        [id, change, reason]
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

  // Mendapatkan history stok
  static async getStockHistory(req: Request, res: Response): Promise<void> {
    try {
      const { product_id, limit = 100 } = req.query;
      
      let query = `
        SELECT sh.*, p.name as product_name 
        FROM stock_histories sh 
        JOIN products p ON sh.product_id = p.id_product
      `;
      
      const params: any[] = [];
      
      if (product_id) {
        query += ' WHERE sh.product_id = \$1';
        params.push(product_id);
      }
      
      query += ' ORDER BY sh.created_at DESC LIMIT $' + (params.length + 1);
      params.push(limit);

      const result = await pool.query(query, params);
      res.json(result.rows);

    } catch (error) {
      console.error('Error fetching stock history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Menambah produk baru
  static async addProduct(req: Request, res: Response): Promise<void> {
    try {
      const { name, price, stock, category_id }: Product = req.body;
      
      if (!name || !price || typeof stock !== 'number' || !category_id) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await pool.query(
        'INSERT INTO products (name, price, stock, category_id) VALUES (\$1, \$2, \$3, \$4) RETURNING *',
        [name, price, stock, category_id]
      );

      // Record initial stock
      await pool.query(
        'INSERT INTO stock_histories (product_id, change, reason) VALUES (\$1, \$2, \$3)',
        [result.rows[0].id_product, stock, 'Initial stock']
      );

      res.status(201).json({
        message: 'Product added successfully',
        product: result.rows[0]
      });

    } catch (error) {
      console.error('Error adding product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}