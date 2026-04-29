import Image from 'next/image'

interface LogoSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

const SIZES = {
  sm: 'w-8 h-8',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
}

export function LogoSpinner({ size = 'md', label, className = '' }: LogoSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Image
        src="/maigem-logo.png"
        alt="Loading"
        width={192}
        height={192}
        className={`${SIZES[size]} rounded-full animate-spin`}
        style={{ animationDuration: '2s' }}
        priority
      />
      {label && (
        <p className="text-sm text-text-muted tracking-wide">{label}</p>
      )}
    </div>
  )
}
