'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface BillingData {
  order_info: {
    order_id: number;
    order_date: string;
    status: string;
    customer_name: string;
    customer_phone?: string;
  };
  items: Array<{
    product_name: string;
    category: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  summary: {
    subtotal: number;
    tax: number;
    total: number;
  };
  payment?: {
    method: string;
    amount: number;
    payment_date: string;
    payment_ref?: string;
    change: number;
  };
}

interface PaymentForm {
  method: 'cash' | 'non-cash';
  amount: number;
  payment_ref: string;
}

export default function BillingPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params!.orderId as string;
  
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    method: 'cash',
    amount: 0,
    payment_ref: ''
  });

  useEffect(() => {
    if (orderId) {
      fetchBilling();
    }
  }, [orderId]);

  const fetchBilling = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/orders/${orderId}/billing`);
      setBilling(response.data);
      
      // Set default payment amount to order total
      if (response.data.summary.total) {
        setPaymentForm(prev => ({
          ...prev,
          amount: response.data.summary.total
        }));
      }
    } catch (error: any) {
      console.error('Error fetching billing:', error);
      const errorMessage = error.response?.data?.error || 'Failed to load billing information';
      toast.error(errorMessage);
      
      // Redirect back if order not found
      if (error.response?.status === 404) {
        setTimeout(() => router.push('/orders'), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const processPayment = async () => {
    if (!billing) return;

    // Validation
    if (paymentForm.amount < billing.summary.total) {
      toast.error(`Payment amount must be at least Rp ${billing.summary.total.toLocaleString()}`);
      return;
    }

    if (paymentForm.method === 'non-cash' && !paymentForm.payment_ref.trim()) {
      toast.error('Payment reference is required for non-cash payment');
      return;
    }

    setIsProcessingPayment(true);
    
    try {
      await api.post('/payments', {
        order_id: billing.order_info.order_id,
        method: paymentForm.method,
        amount: paymentForm.amount,
        payment_ref: paymentForm.method === 'non-cash' ? paymentForm.payment_ref : null
      });

      toast.success('Payment processed successfully!');
      setShowPaymentForm(false);
      
      // Refresh billing to show payment info
      await fetchBilling();
      
    } catch (error: any) {
      console.error('Error processing payment:', error);
      const errorMessage = error.response?.data?.error || 'Failed to process payment';
      toast.error(errorMessage);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const printBilling = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading billing information...</div>
        </div>
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Billing Not Found</h1>
          <p className="text-gray-600 mb-4">The requested billing information could not be found.</p>
          <button
            onClick={() => router.push('/orders')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          ← Back
        </button>
        
        <div className="space-x-3">
          {billing.order_info.status === 'pending' && (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Process Payment
            </button>
          )}
          <button
            onClick={printBilling}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Print Bill
          </button>
        </div>
      </div>

      {/* Billing Content */}
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:max-w-none">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b print:bg-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Restaurant ABC</h1>
              <p className="text-gray-600">Jl. Contoh No. 123, Jakarta</p>
              <p className="text-gray-600">Telp: (021) 1234-5678</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold">BILL / TAGIHAN</h2>
              <p className="text-gray-600">#{billing.order_info.order_id.toString().padStart(6, '0')}</p>
            </div>
          </div>
        </div>

        {/* Order Information */}
        <div className="px-6 py-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Order Information</h3>
              <p><span className="text-gray-600">Order ID:</span> #{billing.order_info.order_id}</p>
              <p><span className="text-gray-600">Date:</span> {formatDate(billing.order_info.order_date)}</p>
              <p>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  billing.order_info.status === 'paid' ? 'bg-green-100 text-green-800' :
                  billing.order_info.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {billing.order_info.status.toUpperCase()}
                </span>
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Customer Information</h3>
              <p><span className="text-gray-600">Name:</span> {billing.order_info.customer_name}</p>
              {billing.order_info.customer_phone && (
                <p><span className="text-gray-600">Phone:</span> {billing.order_info.customer_phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-6 py-4">
          <h3 className="font-semibold mb-4">Order Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2">
                <tr>
                  <th className="text-left py-2">Item</th>
                  <th className="text-left py-2">Category</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {billing.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3">{item.product_name}</td>
                    <td className="py-3 text-gray-600">{item.category}</td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">{formatCurrency(item.price)}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-gray-50 print:bg-white">
          <div className="max-w-md ml-auto">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(billing.summary.subtotal)}</span>
              </div>
              {billing.summary.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(billing.summary.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(billing.summary.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        {billing.payment && (
          <div className="px-6 py-4 border-t">
            <h3 className="font-semibold mb-4">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><span className="text-gray-600">Method:</span> {billing.payment.method === 'cash' ? 'Cash' : 'Non-Cash'}</p>
                <p><span className="text-gray-600">Amount Paid:</span> {formatCurrency(billing.payment.amount)}</p>
                {billing.payment.change > 0 && (
                  <p><span className="text-gray-600">Change:</span> {formatCurrency(billing.payment.change)}</p>
                )}
              </div>
              <div>
                <p><span className="text-gray-600">Payment Date:</span> {formatDate(billing.payment.payment_date)}</p>
                {billing.payment.payment_ref && (
                  <p><span className="text-gray-600">Reference:</span> {billing.payment.payment_ref}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 text-center text-sm text-gray-600 print:bg-white">
          <p>Thank you for your visit!</p>
          <p>Please keep this receipt for your records.</p>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 print:hidden z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Process Payment</h3>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Order Summary */}
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-medium mb-2">Order Summary</p>
                  <div className="flex justify-between">
                    <span>Order Total:</span>
                    <span className="font-bold">{formatCurrency(billing.summary.total)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="cash"
                        checked={paymentForm.method === 'cash'}
                        onChange={(e) => setPaymentForm({
                          ...paymentForm,
                          method: e.target.value as 'cash' | 'non-cash'
                        })}
                        className="mr-2"
                      />
                      Cash
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="non-cash"
                        checked={paymentForm.method === 'non-cash'}
                        onChange={(e) => setPaymentForm({
                          ...paymentForm,
                          method: e.target.value as 'cash' | 'non-cash'
                        })}
                        className="mr-2"
                      />
                      Non-Cash (Card/Transfer)
                    </label>
                  </div>
                </div>

                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Amount</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({
                      ...paymentForm,
                      amount: parseFloat(e.target.value) || 0
                    })}
                    className="w-full border rounded px-3 py-2"
                    min={billing.summary.total}
                    step="1000"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Minimum: {formatCurrency(billing.summary.total)}
                  </p>
                  {paymentForm.amount > billing.summary.total && (
                    <p className="text-sm text-green-600 mt-1">
                      Change: {formatCurrency(paymentForm.amount - billing.summary.total)}
                    </p>
                  )}
                </div>

                {/* Payment Reference (for non-cash) */}
                {paymentForm.method === 'non-cash' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Reference</label>
                    <input
                      type="text"
                      value={paymentForm.payment_ref}
                      onChange={(e) => setPaymentForm({
                        ...paymentForm,
                        payment_ref: e.target.value
                      })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Transaction ID, Card number (last 4 digits), etc."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Enter transaction reference for non-cash payments
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={processPayment}
                    disabled={isProcessingPayment}
                    className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isProcessingPayment ? 'Processing...' : 'Process Payment'}
                  </button>
                  <button
                    onClick={() => setShowPaymentForm(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                    disabled={isProcessingPayment}
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