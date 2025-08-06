interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  width?: string | number
  height?: string | number
  className?: string
  count?: number
  animation?: 'pulse' | 'wave' | 'shimmer'
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
  animation = 'pulse'
}: SkeletonProps) {
  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    shimmer: 'animate-shimmer'
  }

  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl'
  }

  const defaultSizes = {
    text: { width: '100%', height: '1rem' },
    circular: { width: '3rem', height: '3rem' },
    rectangular: { width: '100%', height: '10rem' },
    card: { width: '100%', height: '20rem' }
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
        bg-gradient-to-r from-navy-700/50 via-navy-600/50 to-navy-700/50
        background-size-200 ${animations[animation]} ${variants[variant]} ${className}
      `}
      style={{
        width: typeof size.width === 'number' ? `${size.width}px` : size.width,
        height: typeof size.height === 'number' ? `${size.height}px` : size.height
      }}
    />
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
            bg-gradient-to-r from-navy-700/50 via-navy-600/50 to-navy-700/50
            background-size-200 ${animations[animation]} ${variants[variant]} ${className}
          `}
          style={{
            width: typeof size.width === 'number' ? `${size.width}px` : size.width,
            height: typeof size.height === 'number' ? `${size.height}px` : size.height,
            // Vary width for text variant to look more natural
            ...(variant === 'text' && index === count - 1 ? { width: '60%' } : {})
          }}
        />
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
    <div className="bg-navy-800/50 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton variant="text" width="50%" height={14} className="mb-2" />
          <Skeleton variant="text" width="30%" height={32} className="mb-2" />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
    </div>
  )
}