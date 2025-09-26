import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Payment - Restaurant Management',
  description: 'Process payment for restaurant orders',
}

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="payment-layout">
      {children}
    </div>
  )
}