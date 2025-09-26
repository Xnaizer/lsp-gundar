'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import api from '@/utils/api'
import toast from 'react-hot-toast'

interface DashboardStats {
  total_orders: number
  pending_orders: number
  paid_orders: number
  cancelled_orders: number
  low_stock_products: number
  total_revenue: number
  today_orders: number
  today_revenue: number
}

interface Order {
  id_order: number
  status: string
  total_amount: number
  order_date: string
  customer_name: string
  is_paid: boolean
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch orders data - backend returns array directly
      const ordersResponse = await api.get('/orders?limit=100')
      const orders = ordersResponse.data || []
      
      // Calculate today's data
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      
      const todayOrders = orders.filter((order: Order) => 
        new Date(order.order_date) >= todayStart
      )
      
      const todayRevenue = todayOrders
        .filter((order: Order) => order.is_paid || order.status === 'paid')
        .reduce((sum: number, order: Order) => sum + parseFloat(order.total_amount.toString()), 0)
      
      // Try to fetch products for low stock (optional)
      let lowStockCount = 0
      try {
        const productsResponse = await api.get('/products?low_stock=10')
        const products = productsResponse.data || []
        lowStockCount = products.length
      } catch (error) {
        console.warn('Could not fetch products data:', error)
      }

      // Calculate stats
      const calculatedStats: DashboardStats = {
        total_orders: orders.length,
        pending_orders: orders.filter((order: Order) => 
          !order.is_paid && order.status === 'pending'
        ).length,
        paid_orders: orders.filter((order: Order) => 
          order.is_paid || order.status === 'paid'
        ).length,
        cancelled_orders: orders.filter((order: Order) => 
          order.status === 'cancelled'
        ).length,
        low_stock_products: lowStockCount,
        total_revenue: orders
          .filter((order: Order) => order.is_paid || order.status === 'paid')
          .reduce((sum: number, order: Order) => sum + parseFloat(order.total_amount.toString()), 0),
        today_orders: todayOrders.length,
        today_revenue: todayRevenue
      }

      setStats(calculatedStats)
      
      // Set recent orders (last 5)
      const sortedOrders = orders
        .sort((a: Order, b: Order) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
        .slice(0, 5)
        .map((order: Order) => ({
          ...order,
          total_amount: parseFloat(order.total_amount.toString()),
          customer_name: order.customer_name || 'Guest'
        }))
      
      setRecentOrders(sortedOrders)
      
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
      
      // Set default stats on error
      setStats({
        total_orders: 0,
        pending_orders: 0,
        paid_orders: 0,
        cancelled_orders: 0,
        low_stock_products: 0,
        total_revenue: 0,
        today_orders: 0,
        today_revenue: 0
      })
    } finally {
      setIsLoading(false)
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string, isPaid: boolean) => {
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

  const navigationCards = [
    {
      title: 'Orders Management',
      description: 'View, create, and manage customer orders',
      href: '/orders',
      icon: '📋',
      color: 'from-blue-500 to-blue-600',
      stats: stats ? `${stats.pending_orders} pending` : 'Loading...'
    },

    {
      title: 'Sales Reports',
      description: 'View detailed sales analytics and reports',
      href: '/reports',
      icon: '📊',
      color: 'from-orange-500 to-orange-600',
      stats: stats ? formatCurrency(stats.total_revenue) : 'Loading...'
    },
    {
      title: 'Stock Management',
      description: 'Monitor and update inventory levels',
      href: '/stock',
      icon: '📦',
      color: 'from-red-500 to-red-600',
      stats: 'Inventory tracking'
    },

  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🍽️ Restaurant Management System
              </h1>
              <p className="text-xl text-gray-600">
                Welcome back! Here's what's happening in your restaurant today.
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Last updated</div>
              <div className="text-sm font-medium text-gray-700">
                {new Date().toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            ))
          ) : stats ? (
            <>
              <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                                        <p className="text-sm font-medium text-gray-600">Today's Orders</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.today_orders}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <span className="text-2xl">📋</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {stats.total_orders} total orders
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(stats.today_revenue)}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {formatCurrency(stats.total_revenue)} total
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.pending_orders}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-full">
                    <span className="text-2xl">⏳</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {stats.paid_orders} completed
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock Alert</p>
                    <p className="text-3xl font-bold text-red-600">{stats.low_stock_products}</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-full">
                    <span className="text-2xl">⚠️</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Items need restocking
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Navigation Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">System Navigation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {navigationCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group block bg-white rounded-lg shadow-sm border hover:shadow-lg transition-all transform hover:-translate-y-1"
              >
                <div className={`bg-gradient-to-r ${card.color} p-6 rounded-t-lg`}>
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <h3 className="text-xl font-bold">{card.title}</h3>
                      <p className="text-sm opacity-90 mt-1">{card.description}</p>
                    </div>
                    <span className="text-4xl opacity-80 group-hover:scale-110 transition-transform">
                      {card.icon}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-sm font-medium text-gray-600">{card.stats}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
              <Link 
                href="/orders" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View all →
              </Link>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id_order} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">
                        Order #{order.id_order.toString().padStart(6, '0')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(order.order_date)} • {order.customer_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </div>
                      <div className="mt-1">
                        {getStatusBadge(order.status, order.is_paid)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-2 block">📋</span>
                <p>No orders yet</p>
                <Link 
                  href="/orders" 
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Create your first order
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/orders"
                className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
              >
                <div className="bg-blue-500 p-2 rounded-lg text-white mr-4 group-hover:scale-110 transition-transform">
                  <span className="text-xl">➕</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Create New Order</div>
                  <div className="text-sm text-gray-600">Start taking a customer order</div>
                </div>
              </Link>

              <Link
                href="/orders"
                className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
              >
                <div className="bg-green-500 p-2 rounded-lg text-white mr-4 group-hover:scale-110 transition-transform">
                  <span className="text-xl">💳</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Process Payments</div>
                  <div className="text-sm text-gray-600">Handle pending order payments</div>
                </div>
              </Link>

              <Link
                href="/reports"
                className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
              >
                <div className="bg-purple-500 p-2 rounded-lg text-white mr-4 group-hover:scale-110 transition-transform">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">View Reports</div>
                  <div className="text-sm text-gray-600">Check sales and analytics</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <div className="font-medium text-gray-900">Database</div>
                <div className="text-sm text-green-600">Connected</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <div className="font-medium text-gray-900">API Server</div>
                <div className="text-sm text-green-600">Running</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <div>
                <div className="font-medium text-gray-900">Last Sync</div>
                <div className="text-sm text-gray-600">{new Date().toLocaleTimeString('id-ID')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}