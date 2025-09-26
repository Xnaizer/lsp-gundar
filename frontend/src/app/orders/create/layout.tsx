import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Order - Restaurant Management',
  description: 'Create new customer order',
}

export default function CreateOrderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}