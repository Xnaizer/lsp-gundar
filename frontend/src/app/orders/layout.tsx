import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Orders - Restaurant Management',
  description: 'Manage restaurant orders and payments',
}

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="orders-layout">
      {children}
    </div>
  )
}