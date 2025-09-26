'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/utils/api'
import toast from 'react-hot-toast'

interface Order {
  id_order: number
  order_date: string
  status: string
  total_amount: number
  customer_name?: string
  customer_phone?: string
  items_count: number
  is_paid: boolean
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalOrders, setTotalOrders] = useState(0)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    fetchOrders()
  }, [currentPage, statusFilter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const offset = (currentPage - 1) * itemsPerPage
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      })
      
      if (statusFilter) {
        params.append('status', statusFilter)
      }
      
      const response = await api.get(`/orders?${params.toString()}`)
      
      // Backend returns array directly, not object with orders property
      const ordersData = Array.isArray(response.data) ? response.data : []
      
      setOrders(ordersData.map(order => ({
        ...order,
        total_amount: parseFloat(order.total_amount) || 0,
        customer_name: order.customer_name || 'Guest',
        items_count: parseInt(order.items_count) || 0
      })))
      
      // For pagination, we'll estimate total based on returned data
      // You might want to add a count endpoint to backend later
      setTotalOrders(ordersData.length === itemsPerPage ? (currentPage * itemsPerPage) + 1 : (currentPage - 1) * itemsPerPage + ordersData.length)
      
    } catch (err: any) {
      console.error('Error fetching orders:', err)
      setError(err.message || 'Failed to fetch orders')
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount).replace('IDR', 'Rp')
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string, isPaid: boolean) => {
    // Use is_paid flag if available, otherwise fall back to status
    const finalStatus = isPaid ? 'paid' : status
    
    const statusConfig = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' },
    }
    
    const config = statusConfig[finalStatus as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <span className="mr-1">{config.icon}</span>
        {finalStatus.toUpperCase()}
      </span>
    )
  }

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const totalPages = Math.ceil(totalOrders / itemsPerPage)

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  if (error && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Orders</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => fetchOrders()}
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
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Orders Management</h1>
              <p className="text-gray-600 mt-1">Manage all restaurant orders and payments</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link 
                href="/"
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                🏠 Dashboard
              </Link>
              <Link 
                href="/orders/create"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                ➕ New Order
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
            <div className="text-gray-600">Orders Shown</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.is_paid || o.status === 'paid').length}
            </div>
            <div className="text-gray-600">Paid Orders</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-yellow-600">
              {orders.filter(o => !o.is_paid && o.status === 'pending').length}
            </div>
            <div className="text-gray-600">Pending Orders</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(orders.reduce((sum, o) => sum + o.total_amount, 0))}
            </div>
            <div className="text-gray-600">Total Value</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="font-medium text-gray-700">Filter by status:</span>
            <button
              onClick={() => handleStatusChange('')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === '' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleStatusChange('pending')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === 'pending' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => handleStatusChange('paid')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === 'paid' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => handleStatusChange('cancelled')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                statusFilter === 'cancelled' 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Cancelled
            </button>
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
                Loading...
              </div>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">All Orders</h2>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                {statusFilter ? `No ${statusFilter} orders found` : 'No Orders Yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {statusFilter ? 'Try changing the filter' : 'Create your first order to get started'}
              </p>
              {!statusFilter && (
                <Link 
                  href="/orders/create"
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  ➕ Create Order
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id_order} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{order.id_order.toString().padStart(6, '0')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.customer_name}
                        </div>
                        {order.customer_phone && (
                          <div className="text-sm text-gray-500">
                            {order.customer_phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(order.order_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {order.items_count} items
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status, order.is_paid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {/* View Invoice */}
                        <Link 
                          href={`/billing/${order.id_order}`}
                          className="inline-block px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                        >
                          📄 Invoice
                        </Link>

                        {/* Pay Now Button - TOMBOL INI! */}
                        {(!order.is_paid && order.status === 'pending') && (
                          <Link 
                            href={`/payment/${order.id_order}`}
                            className="inline-block px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                          >
                            💳 Pay Now
                          </Link>
                        )}

                        {/* Paid Badge */}
                        {(order.is_paid || order.status === 'paid') && (
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                            ✅ Paid
                          </span>
                        )}

                        {/* Cancelled Badge */}
                        {order.status === 'cancelled' && (
                          <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                            ❌ Cancelled
                          </span>
                        )}

                        {/* Order Details */}
                        <Link 
                          href={`/orders/${order.id_order}`}
                          className="inline-block px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                        >
                          👁️ Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {orders.length > 0 && totalPages > 1 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 bg-blue-500 text-white rounded">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/orders/create"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">➕</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">Create New Order</div>
                <div className="text-sm text-gray-500">Add new customer order</div>
              </div>
            </Link>

            <Link 
              href="/products"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">🍽️</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">Manage Products</div>
                <div className="text-sm text-gray-500">View and edit menu items</div>
              </div>
            </Link>

            <Link 
              href="/reports"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-xl">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">View Reports</div>
                <div className="text-sm text-gray-500">Sales and analytics</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}