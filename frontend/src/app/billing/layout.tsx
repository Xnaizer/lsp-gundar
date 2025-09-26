import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Invoice - Restaurant Management',
  description: 'Invoice and billing details for restaurant orders',
  keywords: 'invoice, billing, restaurant, order, payment',
}

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="billing-layout">
      <div className="billing-container">
        {children}
      </div>
    </div>
  )
}