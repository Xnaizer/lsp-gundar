'use client';

import { useState, useEffect } from 'react';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Product {
  id_product: number;
  name: string;
  price: number;
  stock: number;
  category_name: string;
}

interface OrderItem {
  product_id: number;
  quantity: number;
  price: number;
  subtotal: number;
  product_name?: string;
}

interface Order {
  id_order: number;
  status: string;
  total_amount: number;
  order_date: string;
  customer_name?: string;
  items?: OrderItem[];
}

export default function OrdersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product_id === product.id_product);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error(`Maximum stock available: ${product.stock}`);
        return;
      }
      setCart(cart.map(item =>
        item.product_id === product.id_product
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id_product,
        quantity: 1,
        price: product.price,
        subtotal: product.price,
        product_name: product.name
      }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product_id !== productId));
    toast.success('Item removed from cart');
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    const product = products.find(p => p.id_product === productId);
    if (!product) return;

    if (newQuantity > product.stock) {
      toast.error(`Maximum stock available: ${product.stock}`);
      return;
    }

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price }
        : item
    ));
  };

  const createOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/orders', {
        items: cart
      });
      
      toast.success('Order created successfully!');
      setCart([]);
      await fetchOrders();
      await fetchProducts(); // Refresh products to show updated stock
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create order';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const viewOrderDetails = async (orderId: number) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      setSelectedOrder(response.data);
    } catch (error) {
      toast.error('Failed to load order details');
    }
  };

  const getTotalCart = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Restaurant Order Management</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Menu Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((product) => (
              <div key={product.id_product} className="border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-600">{product.category_name}</p>
                    <p className="text-lg font-bold text-green-600">
                      Rp {product.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Stock: {product.stock}
                    </p>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Current Order</h2>
          <div className="border rounded-lg p-4 shadow-sm">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center">Cart is empty</p>
            ) : (
              <div>
                {cart.map((item) => (
                  <div key={item.product_id} className="flex justify-between items-center mb-3 p-2 border-b">
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-gray-600">
                        Rp {item.price.toLocaleString()} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="w-6 h-6 bg-gray-200 rounded text-sm hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="w-6 h-6 bg-gray-200 rounded text-sm hover:bg-gray-300"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xl font-bold">
                    Total: Rp {getTotalCart().toLocaleString()}
                  </p>
                  <button
                    onClick={createOrder}
                    disabled={isLoading}
                    className="w-full mt-3 bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creating Order...' : 'Create Order'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Recent Orders</h2>
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Order ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id_order}>
                    <td className="px-4 py-3 text-sm">#{order.id_order}</td>
                    <td className="px-4 py-3 text-sm">{order.customer_name || 'Guest'}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      Rp {order.total_amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'paid' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(order.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button
                        onClick={() => viewOrderDetails(order.id_order)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Details
                      </button>
                      <Link
                        href={`/billing/${order.id_order}`}
                        className="text-green-600 hover:text-green-800"
                      >
                        Billing
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Order Details</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p><strong>Order ID:</strong> #{selectedOrder.id_order}</p>
                  <p><strong>Customer:</strong> {selectedOrder.customer_name || 'Guest'}</p>
                  <p><strong>Date:</strong> {new Date(selectedOrder.order_date).toLocaleString()}</p>
                  <p><strong>Status:</strong> {selectedOrder.status.toUpperCase()}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Items:</h4>
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b">
                      <div>
                        <p>{item.product_name}</p>
                        <p className="text-sm text-gray-600">
                          Rp {item.price.toLocaleString()} x {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        Rp {item.subtotal.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t">
                  <p className="text-xl font-bold">
                    Total: Rp {selectedOrder.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}