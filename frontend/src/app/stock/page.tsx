'use client';

import { useState, useEffect } from 'react';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface Product {
  id_product: number;
  name: string;
  price: number;
  stock: number;
  category_name: string;
  category_id: number;
  is_active: boolean;
}

interface Category {
  id_category: number;
  name: string;
}

interface StockHistory {
  id_stock: number;
  product_name: string;
  change: number;
  reason: string;
  created_at: string;
}

export default function StockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingStock, setEditingStock] = useState<{ [key: number]: number }>({});

  // New product form
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
    category_id: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchStockHistory();
  }, [selectedCategory, showLowStock]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (showLowStock) params.append('low_stock', '10');

      const response = await api.get(`/products?${params.toString()}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchStockHistory = async () => {
    try {
      const response = await api.get('/stock-history?limit=50');
      setStockHistory(response.data);
    } catch (error) {
      console.error('Error fetching stock history:', error);
    }
  };

  const updateStock = async (productId: number, newStock: number, reason: string = 'Manual update') => {
    if (newStock < 0) {
      toast.error('Stock cannot be negative');
      return
          }

    setIsLoading(true);
    try {
      await api.put(`/products/${productId}/stock`, {
        stock: newStock,
        reason
      });
      
      toast.success('Stock updated successfully');
      setEditingStock({});
      await fetchProducts();
      await fetchStockHistory();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update stock';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock || !newProduct.category_id) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/products', {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock),
        category_id: parseInt(newProduct.category_id)
      });
      
      toast.success('Product added successfully');
      setNewProduct({ name: '', price: '', stock: '', category_id: '' });
      setShowAddForm(false);
      await fetchProducts();
      await fetchStockHistory();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to add product';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditingStock = (productId: number, currentStock: number) => {
    setEditingStock({ ...editingStock, [productId]: currentStock });
  };

  const cancelEditingStock = (productId: number) => {
    const newEditing = { ...editingStock };
    delete newEditing[productId];
    setEditingStock(newEditing);
  };

  const saveStockEdit = (productId: number) => {
    const newStock = editingStock[productId];
    if (newStock !== undefined) {
      updateStock(productId, newStock);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Stock Management</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add New Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4 mb-6">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id_category} value={category.id_category}>
              {category.name}
            </option>
          ))}
        </select>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
          />
          <span>Show Low Stock Only (&le; 10)</span>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Products Stock</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Product</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Stock</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id_product}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.stock <= 10 && (
                            <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{product.category_name}</td>
                      <td className="px-4 py-3 text-sm">
                        Rp {product.price.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {editingStock[product.id_product] !== undefined ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={editingStock[product.id_product]}
                              onChange={(e) => setEditingStock({
                                ...editingStock,
                                [product.id_product]: parseInt(e.target.value) || 0
                              })}
                              className="w-20 border rounded px-2 py-1"
                              min="0"
                            />
                            <button
                              onClick={() => saveStockEdit(product.id_product)}
                              className="text-green-600 hover:text-green-800 text-sm"
                              disabled={isLoading}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => cancelEditingStock(product.id_product)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${product.stock <= 10 ? 'text-red-600' : ''}`}>
                              {product.stock}
                            </span>
                            <button
                              onClick={() => startEditingStock(product.id_product, product.stock)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateStock(product.id_product, product.stock + 10, 'Restock +10')}
                            className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600"
                            disabled={isLoading}
                          >
                            +10
                          </button>
                          <button
                            onClick={() => updateStock(product.id_product, product.stock + 50, 'Restock +50')}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600"
                            disabled={isLoading}
                          >
                            +50
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Stock History */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Recent Stock Changes</h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {stockHistory.map((history) => (
                <div key={history.id_stock} className="px-6 py-3 border-b last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{history.product_name}</p>
                      <p className="text-xs text-gray-600">{history.reason}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(history.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-sm font-medium ${
                      history.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {history.change > 0 ? '+' : ''}{history.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Add New Product</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={newProduct.category_id}
                    onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id_category} value={category.id_category}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Price</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Enter price"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Enter initial stock"
                    min="0"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={addProduct}
                    disabled={isLoading}
                    className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {isLoading ? 'Adding...' : 'Add Product'}
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}