'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface DashboardStats {
  total_orders: number;
  pending_orders: number;
  low_stock_products: number;
  total_revenue: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch multiple endpoints for dashboard
      const [ordersRes, productsRes, reportsRes] = await Promise.all([
        api.get('/orders?limit=100'),
        api.get('/products?low_stock=10'),
        api.get('/reports/sales?period=monthly')
      ]);

      const orders = ordersRes.data;
      const lowStockProducts = productsRes.data;
      const report = reportsRes.data;

      setStats({
        total_orders: orders.length,
        pending_orders: orders.filter((order: any) => order.status === 'pending').length,
        low_stock_products: lowStockProducts.length,
        total_revenue: report.summary.total_revenue || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const quickActions = [
    {
      title: 'New Order',
      description: 'Create a new customer order',
      href: '/orders',
      icon: '➕',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Manage Stock',
      description: 'Update product inventory',
      href: '/stock',
      icon: '📦',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'View Reports',
      description: 'Check sales analytics',
      href: '/reports',
      icon: '📊',
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Restaurant Management Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome to your restaurant management system. Monitor operations and manage your business efficiently.
        </p>
      </div>

      {/* Stats Overview */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total_orders}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <span className="text-2xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending_orders}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <span className="text-2xl">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{stats.low_stock_products}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.total_revenue)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={`${action.color} text-white rounded-lg p-6 transition-colors block`}
            >
              <div className="flex items-center space-x-4">
                <span className="text-3xl">{action.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">Database Connection</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">Connected</span>
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">Last Updated</h3>
            <p className="text-sm text-gray-600">{new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}