import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Order Details - Restaurant Management',
  description: 'View order details and information',
}

export default function OrderDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}