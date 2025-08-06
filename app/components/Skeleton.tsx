interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'button' | 'avatar' | 'badge'
  width?: string | number
  height?: string | number
  className?: string
  count?: number
  animation?: 'pulse' | 'wave' | 'shimmer' | 'glow'
  delay?: number
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
  animation = 'shimmer',
  delay = 0,
  rounded
}: SkeletonProps) {
  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    shimmer: 'animate-shimmer',
    glow: 'animate-glow'
  }

  const roundedClasses = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  }

  const variants = {
    text: rounded ? roundedClasses[rounded] : 'rounded',
    circular: 'rounded-full',
    rectangular: rounded ? roundedClasses[rounded] : 'rounded-lg',
    card: rounded ? roundedClasses[rounded] : 'rounded-xl',
    button: rounded ? roundedClasses[rounded] : 'rounded-lg',
    avatar: 'rounded-full',
    badge: rounded ? roundedClasses[rounded] : 'rounded-full'
  }

  const defaultSizes = {
    text: { width: '100%', height: '1rem' },
    circular: { width: '3rem', height: '3rem' },
    rectangular: { width: '100%', height: '10rem' },
    card: { width: '100%', height: '20rem' },
    button: { width: '6rem', height: '2.5rem' },
    avatar: { width: '2.5rem', height: '2.5rem' },
    badge: { width: '4rem', height: '1.5rem' }
  }

  const getSize = () => {
    const defaults = defaultSizes[variant]
    return {
      width: width || defaults.width,
      height: height || defaults.height
    }
  }

  const size = getSize()

  const skeletonElement = (
    <div
      className={`
        relative overflow-hidden
        bg-gradient-to-r from-navy-700/50 via-navy-600/50 to-navy-700/50
        ${animation === 'shimmer' ? 'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-gold-500/10 before:to-transparent' : ''}
        ${animations[animation]} ${variants[variant]} ${className}
      `}
      style={{
        width: typeof size.width === 'number' ? `${size.width}px` : size.width,
        height: typeof size.height === 'number' ? `${size.height}px` : size.height,
        animationDelay: delay ? `${delay}ms` : undefined
      }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )

  if (count === 1) {
    return skeletonElement
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`
            relative overflow-hidden
            bg-gradient-to-r from-navy-700/50 via-navy-600/50 to-navy-700/50
            ${animation === 'shimmer' ? 'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-gold-500/10 before:to-transparent' : ''}
            ${animations[animation]} ${variants[variant]} ${className}
          `}
          style={{
            width: typeof size.width === 'number' ? `${size.width}px` : size.width,
            height: typeof size.height === 'number' ? `${size.height}px` : size.height,
            // Vary width for text variant to look more natural
            ...(variant === 'text' && index === count - 1 ? { width: '60%' } : {}),
            animationDelay: delay ? `${delay + (index * 100)}ms` : `${index * 100}ms`
          }}
          role="status"
          aria-label="Loading"
        >
          <span className="sr-only">Loading...</span>
        </div>
      ))}
    </div>
  )
}

// Card Skeleton preset
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-navy-800/50 rounded-xl p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton variant="text" width="60%" height={24} className="mb-2" />
          <Skeleton variant="text" width="40%" height={16} />
        </div>
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" count={3} />
      </div>
    </div>
  )
}

// Table Row Skeleton preset
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-gold-500/10">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="py-4 px-4">
          <Skeleton variant="text" width={index === 0 ? '80%' : '60%'} />
        </td>
      ))}
    </tr>
  )
}

// Stat Card Skeleton preset
export function SkeletonStatCard() {
  return (
    <div className="bg-navy-800/50 rounded-xl p-6 border border-gold-500/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton variant="text" width="50%" height={14} className="mb-2" animation="shimmer" />
          <Skeleton variant="text" width="30%" height={32} className="mb-2" animation="shimmer" delay={100} />
          <Skeleton variant="text" width="40%" height={12} animation="shimmer" delay={200} />
        </div>
        <Skeleton variant="circular" width={48} height={48} animation="pulse" />
      </div>
    </div>
  )
}

// Form Skeleton preset
export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton variant="text" width="30%" height={14} animation="shimmer" delay={index * 100} />
          <Skeleton variant="rectangular" height={40} rounded="lg" animation="shimmer" delay={index * 100 + 50} />
        </div>
      ))}
      <div className="flex gap-4 pt-4">
        <Skeleton variant="button" width={100} height={40} animation="pulse" />
        <Skeleton variant="button" width={100} height={40} animation="pulse" delay={100} />
      </div>
    </div>
  )
}

// List Item Skeleton preset
export function SkeletonListItem({ avatar = true, actions = true }: { avatar?: boolean; actions?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gold-500/10">
      {avatar && <Skeleton variant="avatar" animation="pulse" />}
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="40%" height={16} animation="shimmer" />
        <Skeleton variant="text" width="60%" height={14} animation="shimmer" delay={100} />
      </div>
      {actions && (
        <div className="flex gap-2">
          <Skeleton variant="circular" width={32} height={32} animation="pulse" />
          <Skeleton variant="circular" width={32} height={32} animation="pulse" delay={100} />
        </div>
      )}
    </div>
  )
}

// Navigation Skeleton preset
export function SkeletonNavigation({ items = 5 }: { items?: number }) {
  return (
    <nav className="space-y-2">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3">
          <Skeleton variant="circular" width={24} height={24} animation="pulse" delay={index * 50} />
          <Skeleton variant="text" width="70%" height={16} animation="shimmer" delay={index * 50 + 25} />
        </div>
      ))}
    </nav>
  )
}

// Dashboard Widget Skeleton
export function SkeletonWidget() {
  return (
    <div className="bg-navy-800/50 rounded-xl p-6 border border-gold-500/20">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" width="40%" height={20} animation="shimmer" />
        <Skeleton variant="badge" animation="pulse" />
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton variant="text" width="30%" animation="shimmer" delay={100} />
          <Skeleton variant="text" width="20%" animation="shimmer" delay={150} />
        </div>
        <Skeleton variant="rectangular" height={8} rounded="full" animation="shimmer" delay={200} />
      </div>
    </div>
  )
}

// Avatar with Text Skeleton
export function SkeletonAvatarText({ lines = 2 }: { lines?: number }) {
  return (
    <div className="flex items-start gap-3">
      <Skeleton variant="avatar" width={40} height={40} animation="pulse" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="50%" height={16} animation="shimmer" />
        {lines > 1 && <Skeleton variant="text" width="70%" height={14} animation="shimmer" delay={100} />}
      </div>
    </div>
  )
}