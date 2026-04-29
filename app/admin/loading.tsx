import { LogoSpinner } from '@/components/ui/logo-spinner'

export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LogoSpinner size="lg" label="Loading..." />
    </div>
  )
}
