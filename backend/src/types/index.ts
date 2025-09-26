export interface Customer {
  id_customer?: number;
  name: string;
  phone?: string;
  email?: string;
  created_at?: Date;
}

export interface Category {
  id_category: number;
  name: string;
}

export interface Product {
  id_product: number;
  name: string;
  price: number;
  stock: number;
  category_id: number;
  is_active: boolean;
}

export interface Order {
  id_order?: number;
  customer_id?: number;
  order_date?: Date;
  status: 'pending' | 'paid' | 'cancelled';
  total_amount: number;
  items?: OrderItem[];
}

export interface OrderItem {
  id_order_item?: number;
  order_id?: number;
  product_id: number;
  quantity: number;
  price: number;
  subtotal: number;
  product_name?: string;
}

export interface Payment {
  id_payment?: number;
  order_id: number;
  method: 'cash' | 'non-cash';
  amount: number;
  payment_date?: Date;
  payment_ref?: string;
}

export interface StockHistory {
  id_stock?: number;
  product_id: number;
  change: number;
  reason: string;
  created_at?: Date;
  user_id?: number;
}