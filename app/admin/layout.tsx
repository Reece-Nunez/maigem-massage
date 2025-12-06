import { AdminSidebar } from '@/components/admin/sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <AdminSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
        {children}
      </main>
    </div>
  )
}
