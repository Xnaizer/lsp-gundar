'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface BillingData {
  order_info: {
    order_id: number
    order_date: string
    status: string
    customer_name: string
    customer_phone?: string | null
    customer_email?: string | null
    notes?: string | null
  }
  items: Array<{
    id_order_item: number
    product_name: string
    category: string
    quantity: number
    price: number
    subtotal: number
  }>
  summary: {
    subtotal: number
    tax: number
    service_charge: number
    total: number
    items_count: number
  }
  payment?: {
    id_payment: number
    method: string
    amount: number
    payment_date: string
    payment_ref?: string | null
    change: number
    notes?: string | null
  } | null
  generated_at: string
}

interface DebugInfo {
  urlPath?: string
  params?: any
  orderId?: string | string[]
  apiBase?: string
  fullApiUrl?: string
  timestamp?: string
  responseStatus?: number
  responseHeaders?: any
}

export default function BillingPage() {
  const params = useParams()
  const router = useRouter()
  const [billing, setBilling] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({})

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Extract order ID from params
        const orderId = Array.isArray(params.id) ? params.id[0] : params.id
        
        if (!orderId) {
          throw new Error('No order ID provided in URL')
        }

        // Setup API URL
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
        const fullUrl = `${apiUrl}/orders/${orderId}/billing`
        
        // Update debug info
        const currentDebugInfo = {
          urlPath: typeof window !== 'undefined' ? window.location.pathname : '',
          params: params,
          orderId: orderId,
          apiBase: apiUrl,
          fullApiUrl: fullUrl,
          timestamp: new Date().toISOString()
        }
        
        setDebugInfo(currentDebugInfo)
        
        // Log debug info
        console.group('🔍 Billing Page Debug')
        console.log('URL Path:', currentDebugInfo.urlPath)
        console.log('Route Params:', currentDebugInfo.params)
        console.log('Extracted Order ID:', currentDebugInfo.orderId)
        console.log('API Base URL:', currentDebugInfo.apiBase)
        console.log('Full API URL:', currentDebugInfo.fullApiUrl)
        console.groupEnd()
        
        // Fetch data
        console.log('📡 Fetching billing data...')
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        // Update debug info with response
        setDebugInfo(prev => ({
          ...prev,
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries())
        }))
        
        console.log('📡 API Response Status:', response.status)
        console.log('📡 API Response Headers:', Object.fromEntries(response.headers.entries()))
        
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`
          
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorData.message || errorMessage
          } catch (parseError) {
            console.warn('Could not parse error response as JSON')
          }
          
          throw new Error(errorMessage)
        }

        const data = await response.json()
        console.log('✅ Billing data received:', data)
        
        // Validate data structure
        if (!data.order_info || !data.items || !data.summary) {
          throw new Error('Invalid billing data structure received from API')
        }
        
        setBilling(data)
        
      } catch (err) {
        console.error('❌ Error fetching billing:', err)
        setError(err instanceof Error ? err.message : 'Failed to load billing data')
      } finally {
        setLoading(false)
      }
    }

    if (params?.id) {
      fetchBilling()
    } else {
      console.error('❌ No order ID in params:', params)
      setError('No order ID provided in URL parameters')
      setLoading(false)
    }
  }, [params])

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      router.back()
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('IDR', 'Rp')
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
        <span className="mr-1">{config.icon}</span>
        {status.toUpperCase()}
      </span>
    )
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center fade-in">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Invoice...</h2>
          <p className="text-gray-500">Please wait while we fetch your billing information</p>
          <div className="mt-4 text-sm text-gray-400">
            <p>Order ID: {Array.isArray(params.id) ? params.id[0] : params.id}</p>
            <p>API: {debugInfo.fullApiUrl}</p>
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center max-w-2xl mx-auto p-8 fade-in">
          <div className="text-red-500 text-8xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Unable to Load Invoice</h1>
          <p className="text-red-600 text-lg mb-6">{error}</p>
          
          <div className="bg-gray-100 p-6 rounded-lg text-left mb-6">
            <h3 className="font-bold text-gray-700 mb-4">🔧 Debug Information:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Order ID:</strong> {debugInfo.orderId}</p>
                <p><strong>Current URL:</strong> {debugInfo.urlPath}</p>
                <p><strong>API Base:</strong> {debugInfo.apiBase}</p>
              </div>
              <div>
                <p><strong>Full API URL:</strong> {debugInfo.fullApiUrl}</p>
                <p><strong>Response Status:</strong> {debugInfo.responseStatus || 'N/A'}</p>
                <p><strong>Timestamp:</strong> {debugInfo.timestamp}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-300">
              <h4 className="font-medium mb-2">🧪 Quick Tests:</h4>
              <div className="space-y-1">
                <a 
                  href={debugInfo.fullApiUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-blue-600 underline hover:text-blue-800 text-xs"
                >
                  → Test Billing API: {debugInfo.fullApiUrl}
                </a>
                <a 
                  href={`${debugInfo.apiBase}/orders/${debugInfo.orderId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-blue-600 underline hover:text-blue-800 text-xs"
                >
                  → Check Order Exists: {debugInfo.apiBase}/orders/{debugInfo.orderId}
                </a>
                <a 
                  href={`${debugInfo.apiBase}/orders`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-blue-600 underline hover:text-blue-800 text-xs"
                >
                  → View All Orders: {debugInfo.apiBase}/orders
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              🔄 Retry Loading
            </button>
            <button 
              onClick={handleBack}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              ← Go Back
            </button>
            <Link 
              href="/"
              className="inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              🏠 Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // No Data State
  if (!billing) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center fade-in">
          <div className="text-gray-400 text-8xl mb-6">📄</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">No Invoice Data Found</h1>
          <p className="text-gray-600 mb-6">
            No billing information found for order #{debugInfo.orderId}
          </p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={handleBack}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Go Back
            </button>
            <Link 
              href="/"
              className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              🏠 Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Main Invoice Content
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body { 
            margin: 0; 
            background: white !important; 
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .no-print { display: none !important; }
          .print-page { 
            box-shadow: none !important; 
            margin: 0 !important;
            border-radius: 0 !important;
          }
          .page-break { page-break-before: always; }
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="py-8 px-4 fade-in">
        <div className="max-w-4xl mx-auto">
          {/* Header Actions - No Print */}
          <div className="no-print mb-8 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBack}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                ← Back
              </button>
              <Link 
                href="/"
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                🏠 Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right text-sm text-gray-600">
                <p>Invoice for Order #{billing.order_info.order_id}</p>
                <p>Generated: {formatDate(billing.generated_at)}</p>
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                🖨️ Print Invoice
              </button>
            </div>
          </div>

          {/* Invoice Container */}
          <div className="print-page bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Invoice Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-bold mb-2">INVOICE</h1>
                  <p className="text-blue-100 text-lg">Restaurant Management System</p>
                  <p className="text-blue-200 text-sm mt-1">Professional Billing Solution</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold mb-1">
                    #{billing.order_info.order_id.toString().padStart(6, '0')}
                  </div>
                  <p className="text-blue-100">Order ID: {billing.order_info.order_id}</p>
                  <p className="text-blue-200 text-sm">
                    Generated: {new Date(billing.generated_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* Order & Customer Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    📋 Order Information
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-600">Date & Time:</span>
                      <span className="text-gray-800">{formatDate(billing.order_info.order_date)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-600">Status:</span>
                      {getStatusBadge(billing.order_info.status)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-600">Items Count:</span>
                      <span className="font-bold text-blue-600">{billing.summary.items_count} items</span>
                    </div>
                    {billing.order_info.notes && (
                      <div className="pt-3 border-t border-gray-200">
                        <span className="font-medium text-gray-600">Notes:</span>
                        <p className="mt-1 text-gray-800 bg-white p-3 rounded border">
                          {billing.order_info.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    👤 Customer Information
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-600">Name:</span>
                      <span className="font-bold text-gray-800">{billing.order_info.customer_name}</span>
                    </div>
                    {billing.order_info.customer_phone ? (
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-600">Phone:</span>
                        <span className="text-gray-800">{billing.order_info.customer_phone}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-600">Phone:</span>
                        <span className="text-gray-400 italic">Not provided</span>
                      </div>
                    )}
                    {billing.order_info.customer_email ? (
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-600">Email:</span>
                        <span className="text-gray-800">{billing.order_info.customer_email}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-600">Email:</span>
                        <span className="text-gray-400 italic">Not provided</span>
                      </div>
                    )}
                    {billing.order_info.customer_name === 'Guest' && (
                      <div className="pt-3 border-t border-gray-200">
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="text-blue-800 text-sm font-medium">👥 Walk-in Customer</p>
                          <p className="text-blue-600 text-xs mt-1">No customer account required</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  🍽️ Order Items
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left py-4 px-6 font-bold text-gray-700">Item Name</th>
                        <th className="text-left py-4 px-4 font-bold text-gray-700">Category</th>
                        <th className="text-center py-4 px-4 font-bold text-gray-700">Qty</th>
                        <th className="text-right py-4 px-4 font-bold text-gray-700">Unit Price</th>
                        <th className="text-right py-4 px-6 font-bold text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billing.items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 font-medium text-gray-800">{item.product_name}</td>
                          <td className="py-4 px-4">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-lg">{item.quantity}</td>
                          <td className="py-4 px-4 text-right text-gray-700">{formatCurrency(item.price)}</td>
                          <td className="py-4 px-6 text-right font-bold text-lg text-blue-600">
                            {formatCurrency(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="flex justify-end mb-8">
                <div className="w-full max-w-md">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border-2 border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-6 text-center text-xl">💰 Order Summary</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Subtotal ({billing.summary.items_count} items):</span>
                        <span className="font-bold text-lg">{formatCurrency(billing.summary.subtotal)}</span>
                      </div>
                      {billing.summary.tax > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-bold">{formatCurrency(billing.summary.tax)}</span>
                        </div>
                      )}
                      {billing.summary.service_charge > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Service Charge:</span>
                          <span className="font-bold">{formatCurrency(billing.summary.service_charge)}</span>
                        </div>
                      )}
                      <div className="border-t-2 border-gray-300 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-bold text-gray-800">TOTAL:</span>
                          <span className="text-2xl font-bold text-blue-600">
                            {formatCurrency(billing.summary.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              {billing.payment ? (
                <div className="border-t-2 border-gray-200 pt-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    💳 Payment Information
                  </h3>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 p-6 rounded-lg">
                    <div className="flex items-center mb-6">
                      <span className="text-green-600 text-3xl mr-3">✅</span>
                      <div>
                        <span className="text-green-800 font-bold text-xl">PAYMENT COMPLETED</span>
                        <p className="text-green-700 text-sm">Transaction successfully processed</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">Payment Method:</span>
                          <span className="font-bold text-lg uppercase bg-white px-3 py-1 rounded border">
                            {billing.payment.method}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">Amount Paid:</span>
                          <span className="font-bold text-lg text-green-700">
                            {formatCurrency(billing.payment.amount)}
                          </span>
                        </div>
                        {billing.payment.change > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-700">Change:</span>
                            <span className="font-bold text-lg text-green-700">
                              {formatCurrency(billing.payment.change)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">Payment Date:</span>
                          <span className="text-gray-800">{formatDate(billing.payment.payment_date)}</span>
                        </div>
                        {billing.payment.payment_ref && (
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-700">Reference:</span>
                            <span className="font-mono text-sm bg-white px-3 py-1 rounded border border-gray-300">
                              {billing.payment.payment_ref}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {billing.payment.notes && (
                      <div className="mt-6 pt-4 border-t border-green-200">
                        <span className="font-medium text-gray-700">Payment Notes:</span>
                        <p className="mt-2 text-green-800 bg-white p-3 rounded border">
                          {billing.payment.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-t-2 border-gray-200 pt-8">
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 p-6 rounded-lg">
                    <div className="flex items-center mb-4">
                      <span className="text-yellow-600 text-3xl mr-3">⏳</span>
                      <div>
                        <span className="text-yellow-800 font-bold text-xl">PAYMENT PENDING</span>
                        <p className="text-yellow-700">This order requires payment to complete the transaction</p>
                      </div>
                    </div>
                    <div className="bg-yellow-100 border border-yellow-300 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-yellow-800 font-bold text-lg">Total Amount Due:</span>
                        <span className="text-2xl font-bold text-yellow-900">
                          {formatCurrency(billing.summary.total)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-yellow-700 text-sm">
                        Please process payment through your POS system or payment gateway
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="border-t-2 border-gray-200 pt-8 mt-8">
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <div>
                    <p className="font-bold text-gray-700">Restaurant Management System</p>
                    <p>Professional Point of Sale Solution</p>
                    <p className="mt-1">Thank you for your business! 🙏</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Invoice Generated:</p>
                    <p>{formatDate(billing.generated_at)}</p>
                    <p className="mt-2 text-xs text-gray-400">
                      This is a computer-generated invoice
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Debug Info - No Print */}
          <div className="no-print mt-8 bg-white rounded-lg shadow-sm overflow-hidden">
            <details className="group">
              <summary className="cursor-pointer bg-gray-100 px-6 py-4 font-bold text-gray-700 hover:bg-gray-200 transition-colors">
                🔧 Debug Information & API Testing (Click to expand)
              </summary>
              <div className="p-6 space-y-6">
                {/* URL & Route Info */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-bold text-blue-800 mb-3">🌐 URL & Route Information</h4>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p><strong className="text-blue-700">Current URL:</strong> {debugInfo.urlPath}</p>
                      <p><strong className="text-blue-700">Route Params:</strong> {JSON.stringify(debugInfo.params)}</p>
                      <p><strong className="text-blue-700">Extracted Order ID:</strong> {debugInfo.orderId}</p>
                    </div>
                    <div className="space-y-2">
                      <p><strong className="text-blue-700">API Base URL:</strong> {debugInfo.apiBase}</p>
                      <p><strong className="text-blue-700">Full API URL:</strong> {debugInfo.fullApiUrl}</p>
                      <p><strong className="text-blue-700">Response Status:</strong> {debugInfo.responseStatus || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* API Test Links */}
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h4 className="font-bold text-green-800 mb-3">🧪 API Test Links</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div>
                        <strong className="text-green-700 text-sm">Direct Billing API:</strong>
                        <a 
                          href={debugInfo.fullApiUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-blue-600 underline hover:text-blue-800 text-xs break-all mt-1"
                        >
                          {debugInfo.fullApiUrl}
                        </a>
                      </div>
                      <div>
                        <strong className="text-green-700 text-sm">Check Order Exists:</strong>
                        <a 
                          href={`${debugInfo.apiBase}/orders/${debugInfo.orderId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-blue-600 underline hover:text-blue-800 text-xs break-all mt-1"
                        >
                          {debugInfo.apiBase}/orders/{debugInfo.orderId}
                        </a>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <strong className="text-green-700 text-sm">All Orders:</strong>
                        <a 
                          href={`${debugInfo.apiBase}/orders`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-blue-600 underline hover:text-blue-800 text-xs break-all mt-1"
                        >
                          {debugInfo.apiBase}/orders
                        </a>
                      </div>
                      <div>
                        <strong className="text-green-700 text-sm">API Health Check:</strong>
                        <a 
                          href={debugInfo.apiBase} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-blue-600 underline hover:text-blue-800 text-xs break-all mt-1"
                        >
                          {debugInfo.apiBase}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Data Summary */}
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <h4 className="font-bold text-gray-800 mb-3">📄 Current Invoice Data Summary</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-2">
                      <p><strong className="text-gray-700">Order ID:</strong> {billing.order_info.order_id}</p>
                      <p><strong className="text-gray-700">Status:</strong> 
                        <span className="ml-1">{getStatusBadge(billing.order_info.status)}</span>
                      </p>
                      <p><strong className="text-gray-700">Customer:</strong> {billing.order_info.customer_name}</p>
                    </div>
                    <div className="space-y-2">
                      <p><strong className="text-gray-700">Items Count:</strong> {billing.summary.items_count}</p>
                      <p><strong className="text-gray-700">Total Amount:</strong> {formatCurrency(billing.summary.total)}</p>
                      <p><strong className="text-gray-700">Payment Status:</strong> 
                        <span className={`ml-1 px-2 py-1 rounded text-xs font-bold ${
                          billing.payment ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {billing.payment ? 'PAID' : 'PENDING'}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p><strong className="text-gray-700">Order Date:</strong> {new Date(billing.order_info.order_date).toLocaleDateString('id-ID')}</p>
                      <p><strong className="text-gray-700">Generated At:</strong> {new Date(billing.generated_at).toLocaleDateString('id-ID')}</p>
                      <p><strong className="text-gray-700">Debug Timestamp:</strong> {debugInfo.timestamp}</p>
                    </div>
                  </div>
                </div>

                {/* Environment Info */}
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <h4 className="font-bold text-purple-800 mb-3">⚙️ Environment Information</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p><strong className="text-purple-700">Frontend URL:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</p>
                      <p><strong className="text-purple-700">API Base URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}</p>
                      <p><strong className="text-purple-700">Environment:</strong> {process.env.NODE_ENV || 'development'}</p>
                    </div>
                    <div className="space-y-2">
                      <p><strong className="text-purple-700">User Agent:</strong> {typeof window !== 'undefined' ? window.navigator.userAgent.substring(0, 50) + '...' : 'N/A'}</p>
                      <p><strong className="text-purple-700">Screen Resolution:</strong> {typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A'}</p>
                      <p><strong className="text-purple-700">Timezone:</strong> {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                    </div>
                  </div>
                </div>

                {/* Response Headers */}
                {debugInfo.responseHeaders && (
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                    <h4 className="font-bold text-orange-800 mb-3">📡 API Response Headers</h4>
                    <div className="text-xs">
                      <pre className="bg-white p-3 rounded border text-gray-700 overflow-x-auto">
                        {JSON.stringify(debugInfo.responseHeaders, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Raw JSON Data */}
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <details>
                    <summary className="cursor-pointer font-bold text-gray-800 hover:text-gray-900">
                      📋 Raw JSON Invoice Data (Click to expand)
                    </summary>
                    <div className="mt-4">
                      <div className="bg-white p-4 rounded border text-xs">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-700">Invoice Data ({JSON.stringify(billing).length} characters)</span>
                          <button
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                navigator.clipboard.writeText(JSON.stringify(billing, null, 2))
                                  .then(() => alert('JSON data copied to clipboard!'))
                                  .catch(() => alert('Failed to copy to clipboard'))
                              }
                            }}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            📋 Copy JSON
                          </button>
                        </div>
                        <pre className="overflow-auto max-h-96 text-gray-700">
                          {JSON.stringify(billing, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </details>
                </div>

                {/* Performance Info */}
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                  <h4 className="font-bold text-indigo-800 mb-3">⚡ Performance Information</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p><strong className="text-indigo-700">Page Load Time:</strong> {typeof window !== 'undefined' ? `${(performance.now()).toFixed(2)}ms` : 'N/A'}</p>
                      <p><strong className="text-indigo-700">Memory Usage:</strong> {typeof window !== 'undefined' && 'memory' in performance ? `${((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB` : 'N/A'}</p>
                    </div>
                    <div className="space-y-2">
                      <p><strong className="text-indigo-700">Connection:</strong> {typeof window !== 'undefined' && 'connection' in navigator ? (navigator as any).connection?.effectiveType || 'Unknown' : 'N/A'}</p>
                      <p><strong className="text-indigo-700">Online Status:</strong> {typeof window !== 'undefined' ? (navigator.onLine ? '🟢 Online' : '🔴 Offline') : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h4 className="font-bold text-yellow-800 mb-3">🚀 Quick Debug Actions</h4>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          console.log('🔍 Full Debug Info:', {
                            debugInfo,
                            billing,
                            params,
                            windowLocation: window.location,
                            timestamp: new Date().toISOString()
                          })
                          alert('Debug info logged to console!')
                        }
                      }}
                      className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                    >
                      📊 Log to Console
                    </button>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          const debugData = {
                            url: window.location.href,
                            orderId: debugInfo.orderId,
                            apiUrl: debugInfo.fullApiUrl,
                            timestamp: new Date().toISOString(),
                            billing: billing
                          }
                          navigator.clipboard.writeText(JSON.stringify(debugData, null, 2))
                            .then(() => alert('Debug data copied to clipboard!'))
                            .catch(() => alert('Failed to copy to clipboard'))
                        }
                      }}
                      className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                    >
                      📋 Copy Debug Data
                    </button>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          const testWindow = window.open(debugInfo.fullApiUrl, '_blank')
                          if (!testWindow) {
                            alert('Popup blocked! Please allow popups and try again.')
                          }
                        }
                      }}
                      className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors"
                    >
                      🧪 Test API in New Tab
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-3 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
                    >
                      🔄 Reload Page
                    </button>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}