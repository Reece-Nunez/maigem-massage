import { LogoSpinner } from '@/components/ui/logo-spinner'

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LogoSpinner size="lg" label="Loading..." />
    </div>
  )
}
