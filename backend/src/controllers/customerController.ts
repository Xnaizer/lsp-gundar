import { Request, Response } from 'express';
import { pool } from '../utils/database';
import { Customer } from '../types';

export class CustomerController {
  // Get all customers
  static async getAllCustomers(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 100, offset = 0, search } = req.query;
      
      let query = 'SELECT * FROM customers';
      const params: any[] = [];
      
      if (search) {
        query += ' WHERE name ILIKE \$1 OR phone ILIKE \$1 OR email ILIKE \$1';
        params.push(`%${search}%`);
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      res.json(result.rows);

    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get customer by ID
  static async getCustomerById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        'SELECT * FROM customers WHERE id_customer = \$1',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      res.json(result.rows[0]);

    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create new customer
  static async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { name, phone, email }: Customer = req.body;
      
      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      // Check if email already exists
      if (email) {
        const existingCustomer = await pool.query(
          'SELECT id_customer FROM customers WHERE email = \$1',
          [email]
        );
        
        if (existingCustomer.rows.length > 0) {
          res.status(400).json({ error: 'Email already exists' });
          return;
        }
      }

      const result = await pool.query(
        'INSERT INTO customers (name, phone, email) VALUES (\$1, \$2, \$3) RETURNING *',
        [name, phone, email]
      );

      res.status(201).json({
        message: 'Customer created successfully',
        customer: result.rows[0]
      });

    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update customer
  static async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, phone, email }: Customer = req.body;
      
      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      // Check if email already exists for other customers
      if (email) {
        const existingCustomer = await pool.query(
          'SELECT id_customer FROM customers WHERE email = \$1 AND id_customer != \$2',
          [email, id]
        );
        
        if (existingCustomer.rows.length > 0) {
          res.status(400).json({ error: 'Email already exists' });
          return;
        }
      }

      const result = await pool.query(
        'UPDATE customers SET name = \$1, phone = \$2, email = \$3 WHERE id_customer = \$4 RETURNING *',
        [name, phone, email, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      res.json({
        message: 'Customer updated successfully',
        customer: result.rows[0]
      });

    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete customer
  static async deleteCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Check if customer has orders
      const ordersCheck = await pool.query(
        'SELECT COUNT(*) as order_count FROM orders WHERE customer_id = \$1',
        [id]
      );

      if (parseInt(ordersCheck.rows[0].order_count) > 0) {
        res.status(400).json({ 
          error: 'Cannot delete customer with existing orders' 
        });
        return;
      }

      const result = await pool.query(
        'DELETE FROM customers WHERE id_customer = \$1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      res.json({
        message: 'Customer deleted successfully',
        customer: result.rows[0]
      });

    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}