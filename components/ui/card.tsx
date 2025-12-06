interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  selected?: boolean
}

export function Card({ children, className = '', onClick, selected }: CardProps) {
  const isClickable = !!onClick

  return (
    <div
      onClick={onClick}
      className={`
        bg-background p-6 rounded-2xl shadow-sm
        ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${selected ? 'ring-2 ring-primary shadow-md' : 'border border-secondary/30'}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-xl font-semibold text-foreground ${className}`}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-text-muted mt-1 ${className}`}>
      {children}
    </p>
  )
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mt-4 pt-4 border-t border-secondary/30 ${className}`}>
      {children}
    </div>
  )
}
