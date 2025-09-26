'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/utils/api'
import toast from 'react-hot-toast'

interface Product {
  id_product: number
  name: string
  price: number
  stock: number
  category_name?: string
  is_active: boolean
}

interface Category {
  id_category: number
  name: string
}

interface Customer {
  id_customer: number
  name: string
  phone?: string
  email?: string
}

interface OrderItem {
  product_id: number
  product_name: string
  price: number
  quantity: number
  subtotal: number
  stock: number
}

export default function CreateOrderPage() {
  const router = useRouter()
  
  // Data states
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  
  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null)
  const [guestCustomerName, setGuestCustomerName] = useState('')
  const [isGuestOrder, setIsGuestOrder] = useState(true)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [searchProduct, setSearchProduct] = useState('')
  
  // UI states
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      
      const [productsRes, categoriesRes, customersRes] = await Promise.all([
        api.get('/products?is_active=true'),
        api.get('/categories'),
        api.get('/customers?limit=50')
      ])
      
      setProducts(productsRes.data || [])
      setCategories(categoriesRes.data || [])
      setCustomers(customersRes.data || [])
      
    } catch (error: any) {
      console.error('Error fetching data:', error)
      setError('Failed to load data')
      toast.error('Failed to load initial data')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesCategory = !selectedCategory || product.id_product === selectedCategory
    const matchesSearch = !searchProduct || 
      product.name.toLowerCase().includes(searchProduct.toLowerCase())
    return matchesCategory && matchesSearch && product.is_active
  })

  const addToOrder = (product: Product) => {
    const existingItem = orderItems.find(item => item.product_id === product.id_product)
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error(`Cannot add more. Only ${product.stock} items available`)
        return
      }
      
      setOrderItems(prev => prev.map(item => 
        item.product_id === product.id_product
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.price
            }
          : item
      ))
    } else {
      if (product.stock < 1) {
        toast.error('Product is out of stock')
        return
      }
      
      const newItem: OrderItem = {
        product_id: product.id_product,
        product_name: product.name,
        price: product.price,
        quantity: 1,
        subtotal: product.price,
        stock: product.stock
      }
      setOrderItems(prev => [...prev, newItem])
    }
    
    toast.success(`Added ${product.name} to order`)
  }

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromOrder(productId)
      return
    }
    
    const item = orderItems.find(item => item.product_id === productId)
    if (!item) return
    
    if (newQuantity > item.stock) {
      toast.error(`Cannot set quantity to ${newQuantity}. Only ${item.stock} items available`)
      return
    }
    
    setOrderItems(prev => prev.map(item => 
      item.product_id === productId
        ? {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * item.price
          }
        : item
    ))
  }

  const removeFromOrder = (productId: number) => {
    setOrderItems(prev => prev.filter(item => item.product_id !== productId))
  }

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + item.subtotal, 0)
  }

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) {
      toast.error('Please add at least one item to the order')
      return
    }
    
    if (!isGuestOrder && !selectedCustomer) {
      toast.error('Please select a customer or create guest order')
      return
    }
    
    if (isGuestOrder && !guestCustomerName.trim()) {
      toast.error('Please enter guest customer name')
      return
    }
    
    try {
      setSubmitting(true)
      
      const orderData = {
        customer_id: isGuestOrder ? undefined : selectedCustomer,
        customer_name: isGuestOrder ? guestCustomerName.trim() : undefined,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      }
      
      console.log('Submitting order:', orderData)
      
      const response = await api.post('/orders', orderData)
      
      toast.success('Order created successfully!')
      console.log('Order created:', response.data)
      
      // Redirect to orders list or order detail
      router.push('/orders')
      
    } catch (error: any) {
      console.error('Error creating order:', error)
      toast.error(error.message || 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount).replace('IDR', 'Rp')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products and data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Data</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => fetchInitialData()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Create New Order</h1>
              <p className="text-gray-600 mt-1">Add products and create customer order</p>
            </div>
            <div className="flex space-x-3">
              <Link 
                href="/orders"
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                ← Back to Orders
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Products</h2>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-64">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <select
                    value={selectedCategory || ''}
                    onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category.id_category} value={category.id_category}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <span className="text-4xl mb-2 block">🔍</span>
                    <p>No products found</p>
                  </div>
                ) : (
                  filteredProducts.map(product => (
                    <div key={product.id_product} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="mb-3">
                        <h3 className="font-semibold text-gray-800">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.category_name}</p>
                      </div>
                      
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-lg font-bold text-blue-600">
                          {formatCurrency(product.price)}
                        </span>
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          product.stock > 10 
                            ? 'bg-green-100 text-green-800'
                            : product.stock > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          Stock: {product.stock}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => addToOrder(product)}
                        disabled={product.stock === 0}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {product.stock === 0 ? 'Out of Stock' : 'Add to Order'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Order Summary Section */}
          <div className="lg:col-span-1">
            {/* Customer Selection */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={isGuestOrder}
                      onChange={() => setIsGuestOrder(true)}
                      className="mr-2"
                    />
                    Guest Order
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!isGuestOrder}
                      onChange={() => setIsGuestOrder(false)}
                      className="mr-2"
                    />
                    Existing Customer
                  </label>
                </div>
                
                {isGuestOrder ? (
                  <input
                    type="text"
                    placeholder="Guest customer name"
                    value={guestCustomerName}
                    onChange={(e) => setGuestCustomerName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <select
                    value={selectedCustomer || ''}
                    onChange={(e) => setSelectedCustomer(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select customer</option>
                    {customers.map(customer => (
                      <option key={customer.id_customer} value={customer.id_customer}>
                        {customer.name} {customer.phone && `(${customer.phone})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Order Summary</h2>
                <span className="text-sm text-gray-500">
                  {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              
              {orderItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-2 block">🛒</span>
                  <p>No items added yet</p>
                  <p className="text-sm">Select products to add to order</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderItems.map(item => (
                    <div key={item.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{item.product_name}</h4>
                        <p className="text-sm text-gray-600">{formatCurrency(item.price)} each</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-300 text-gray-700 rounded-full hover:bg-gray-400 transition-colors"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-8 h-8 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromOrder(item.product_id)}
                          className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors ml-2"
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="font-bold text-gray-800">
                          {formatCurrency(item.subtotal)}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Total */}
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                  
                  {/* Submit Button */}
                  <button
                    onClick={handleSubmitOrder}
                    disabled={submitting || orderItems.length === 0}
                    className="w-full mt-4 px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                        Creating Order...
                      </span>
                    ) : (
                      `🛒 Create Order - ${formatCurrency(calculateTotal())}`
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}