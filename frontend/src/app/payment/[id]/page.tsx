'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Order {
  id_order: number
  order_date: string
  status: string
  total_amount: number
  customer_name?: string
  notes?: string
}

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'non-cash'>('cash')
  const [amountPaid, setAmountPaid] = useState<string>('')
  const [paymentRef, setPaymentRef] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
        const response = await fetch(`${apiUrl}/orders/${params.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch order')
        }
        
        const data = await response.json()
        setOrder(data)
        setAmountPaid(data.total_amount.toString())
        
      } catch (err) {
        console.error('Error fetching order:', err)
        setError(err instanceof Error ? err.message : 'Failed to load order')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchOrder()
    }
  }, [params.id])

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!order) return
    
    try {
      setProcessing(true)
      setError(null)
      
      const paymentData = {
        order_id: order.id_order,
        method: paymentMethod,
        amount: parseFloat(amountPaid),
        payment_ref: paymentMethod === 'non-cash' ? paymentRef : undefined,
        notes: notes || undefined
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
      const response = await fetch(`${apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Payment failed')
      }
      
      const result = await response.json()
      
      // Show success and redirect
      alert(`Payment successful! Change: Rp ${result.change?.toLocaleString('id-ID') || 0}`)
      router.push(`/billing/${order.id_order}`)
      
    } catch (err) {
      console.error('Payment error:', err)
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount).replace('IDR', 'Rp')
  }

  const calculateChange = (): number => {
    if (!order || !amountPaid) return 0
    const paid = parseFloat(amountPaid) || 0
    const total = order.total_amount
    return paid > total ? paid - total : 0
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Error</h1>
          <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
          <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (order.status === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Already Paid</h1>
          <p className="text-gray-600 mb-4">This order has already been paid.</p>
          <div className="space-x-2">
            <Link 
              href={`/billing/${order.id_order}`}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              View Invoice
            </Link>
            <Link href="/" className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Process Payment</h1>
            <Link 
              href="/"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              ← Back
            </Link>
          </div>
          
          {/* Order Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="font-semibold text-gray-700 mb-2">Order Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Order ID:</strong> #{order.id_order}</p>
                <p><strong>Customer:</strong> {order.customer_name || 'Guest'}</p>
              </div>
              <div>
                <p><strong>Date:</strong> {new Date(order.order_date).toLocaleDateString('id-ID')}</p>
                <p><strong>Status:</strong> 
                  <span className="ml-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                    {order.status.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Amount:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Payment Information</h2>
          
          <form onSubmit={handlePayment} className="space-y-6">
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cash')}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">💵 Cash</div>
                    <div className="text-sm text-gray-500">Physical money</div>
                  </div>
                </label>
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="non-cash"
                    checked={paymentMethod === 'non-cash'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'non-cash')}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">💳 Non-Cash</div>
                    <div className="text-sm text-gray-500">Card/Digital</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Amount Paid */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount Paid
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  Rp
                </span>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  min={order.total_amount}
                  step="1000"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter amount"
                />
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Minimum: {formatCurrency(order.total_amount)}
              </div>
              {calculateChange() > 0 && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm font-medium text-green-800">
                    Change: {formatCurrency(calculateChange())}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Reference (for non-cash) */}
            {paymentMethod === 'non-cash' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Reference <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  required={paymentMethod === 'non-cash'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Transaction ID, Card number (last 4 digits), etc."
                />
                <div className="mt-1 text-sm text-gray-500">
                  Enter transaction ID, card last 4 digits, or other reference
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional payment notes..."
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-red-800">{error}</div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={processing || !amountPaid || parseFloat(amountPaid) < order.total_amount}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Processing...
                  </span>
                ) : (
                  `💳 Process Payment - ${formatCurrency(parseFloat(amountPaid) || 0)}`
                )}
              </button>
              <Link
                href={`/orders/${order.id_order}`}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Payment Summary */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Order Total:</span>
              <span className="font-medium">{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount to Pay:</span>
              <span className="font-medium">{formatCurrency(parseFloat(amountPaid) || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-medium capitalize">{paymentMethod}</span>
            </div>
            {calculateChange() > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Change:</span>
                <span className="font-bold">{formatCurrency(calculateChange())}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-bold">
                <span>Status:</span>
                <span className="text-blue-600">
                  {parseFloat(amountPaid) >= order.total_amount ? 'Ready to Process' : 'Insufficient Amount'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}