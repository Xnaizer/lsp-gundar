'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/utils/api'
import toast from 'react-hot-toast'

interface OrderItem {
  id_order_item: number
  product_id: number
  product_name: string
  category_name?: string
  quantity: number
  price: number
  subtotal: number
}

interface Payment {
  id_payment: number
  method: string
  amount: number
  payment_date: string
  payment_ref?: string
  notes?: string
}

interface OrderDetail {
  id_order: number
  customer_id?: number
  customer_name: string
  customer_phone?: string
  customer_email?: string
  order_date: string
  status: string
  total_amount: number
  notes?: string
  items: OrderItem[]
  payment?: Payment
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchOrderDetail()
    }
  }, [params.id])

  const fetchOrderDetail = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get(`/orders/${params.id}`)
      const orderData = response.data
      
      console.log('Order detail response:', orderData)
      
      setOrder({
        ...orderData,
        total_amount: parseFloat(orderData.total_amount) || 0,
        customer_name: orderData.customer_name || 'Guest',
        items: Array.isArray(orderData.items) ? orderData.items.map((item: any) => ({
          ...item,
          price: parseFloat(item.price) || 0,
          subtotal: parseFloat(item.subtotal) || 0
        })) : [],
        payment: orderData.payment ? {
          ...orderData.payment,
          amount: parseFloat(orderData.payment.amount) || 0
        } : undefined
      })
      
    } catch (err: any) {
      console.error('Error fetching order detail:', err)
      setError(err.message || 'Failed to fetch order details')
      toast.error('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (newStatus: string, notes?: string) => {
    if (!order) return
    
    try {
      setUpdatingStatus(true)
      
      await api.put(`/orders/${order.id_order}/status`, {
        status: newStatus,
        notes: notes
      })
      
      toast.success(`Order status updated to ${newStatus}`)
      
      // Refresh order data
      await fetchOrderDetail()
      
    } catch (error: any) {
      console.error('Error updating order status:', error)
      toast.error(error.message || 'Failed to update order status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount).replace('IDR', 'Rp')
  }

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getStatusBadge = (status: string, hasPayment: boolean) => {
    const finalStatus = hasPayment ? 'paid' : status
    
    const statusConfig = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' },
    }
    
    const config = statusConfig[finalStatus as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <span className="mr-1">{config.icon}</span>
        {finalStatus.toUpperCase()}
      </span>
    )
  }

  const canUpdateStatus = (currentStatus: string, hasPayment: boolean) => {
    if (hasPayment) return false // Can't change status if already paid
    return currentStatus === 'pending' // Can only update pending orders
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Not Found</h1>
          <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
          <div className="space-x-2">
            <button 
              onClick={() => fetchOrderDetail()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
            <Link 
              href="/orders"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Order #{order.id_order.toString().padStart(6, '0')}
              </h1>
              <p className="text-gray-600 mt-1">Order details and information</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link 
                href="/orders"
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                ← Back to Orders
              </Link>
              <Link 
                href={`/billing/${order.id_order}`}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                📄 View Invoice
              </Link>
              {(!order.payment && order.status === 'pending') && (
                <Link 
                  href={`/payment/${order.id_order}`}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  💳 Process Payment
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Order ID</label>
                  <p className="text-lg font-semibold text-gray-800">
                    #{order.id_order.toString().padStart(6, '0')}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Order Date</label>
                  <p className="text-gray-800">{formatDateTime(order.order_date)}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(order.status, !!order.payment)}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Total Amount</label>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(order.total_amount)}
                  </p>
                </div>
              </div>
              
              {order.notes && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-600">Notes</label>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg mt-1">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-gray-800">{order.customer_name}</p>
                </div>
                
                {order.customer_phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-gray-800">{order.customer_phone}</p>
                  </div>
                )}
                
                {order.customer_email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-800">{order.customer_email}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Customer Type</label>
                  <p className="text-gray-800">
                    {order.customer_id ? 'Registered Customer' : 'Guest'}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Items</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Product</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Category</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-gray-600">Qty</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Price</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {order.items.map((item) => (
                      <tr key={item.id_order_item}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{item.product_name}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.category_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-600">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold text-gray-800">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-xl text-blue-600">
                        {formatCurrency(order.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payment Information */}
            {order.payment && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Payment Method</label>
                    <p className="text-gray-800 capitalize">{order.payment.method}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Amount Paid</label>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(order.payment.amount)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Payment Date</label>
                    <p className="text-gray-800">{formatDateTime(order.payment.payment_date)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Change</label>
                    <p className="text-lg font-medium text-gray-800">
                      {formatCurrency(Math.max(0, order.payment.amount - order.total_amount))}
                    </p>
                  </div>
                  
                  {order.payment.payment_ref && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Payment Reference</label>
                      <p className="text-gray-800">{order.payment.payment_ref}</p>
                    </div>
                  )}
                  
                  {order.payment.notes && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600">Payment Notes</label>
                      <p className="text-gray-800 bg-gray-50 p-3 rounded-lg mt-1">
                        {order.payment.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Actions</h2>
              
              <div className="space-y-3">
                {/* Payment Actions */}
                {(!order.payment && order.status === 'pending') && (
                  <Link
                    href={`/payment/${order.id_order}`}
                    className="w-full flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    💳 Process Payment
                  </Link>
                )}
                
                {/* Invoice Action */}
                {/* <Link
                  href={`/billing/${order.id_order}`}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  📄 View Invoice
                </Link> */}
                
                {/* Status Update Actions */}
                {canUpdateStatus(order.status, !!order.payment) && (
                  <>
                    <button
                      onClick={() => updateOrderStatus('cancelled', 'Order cancelled by user')}
                      disabled={updatingStatus}
                      className="w-full flex items-center justify-center px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
                    >
                      {updatingStatus ? '⏳ Updating...' : '❌ Cancel Order'}
                    </button>
                  </>
                )}
                
                {/* Navigation Actions */}
                {/* <div className="border-t pt-3 mt-4">
                  <Link
                    href="/orders"
                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    ← Back to Orders
                  </Link>
                </div> */}
              </div>
              
              {/* Order Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Order Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{order.items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Qty:</span>
                    <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total:</span>
                    <span>{formatCurrency(order.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span>{getStatusBadge(order.status, !!order.payment)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}