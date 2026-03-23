'use client'

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'button' | 'avatar' | 'badge'
  width?: string | number
  height?: string | number
  className?: string
  count?: number
  animation?: 'pulse' | 'wave' | 'shimmer' | 'parchment'
  delay?: number
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
  animation = 'parchment',
  delay = 0
}: SkeletonProps) {
  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-wave',
    shimmer: 'animate-shimmer',
    parchment: 'animate-parchment-pulse'
  }

  const variants = {
    text: '',
    circular: 'rounded-full',
    rectangular: '',
    card: '',
    button: '',
    avatar: 'rounded-full',
    badge: 'rounded-sm'
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

  const baseStyle = {
    width: typeof size.width === 'number' ? `${size.width}px` : size.width,
    height: typeof size.height === 'number' ? `${size.height}px` : size.height,
    backgroundColor: 'rgba(30, 19, 12, 0.05)',
    border: '1px solid rgba(30, 19, 12, 0.08)',
  }

  const skeletonElement = (index: number) => (
    <div
      key={index}
      className={`
        relative overflow-hidden
        ${animations[animation]} ${variants[variant]} ${className}
      `}
      style={{
        ...baseStyle,
        width: variant === 'text' && count > 1 && index === count - 1 ? '60%' : baseStyle.width,
        animationDelay: delay ? `${delay + (index * 100)}ms` : `${index * 100}ms`
      }}
      role="status"
      aria-label="Carregando"
    >
      <span className="sr-only">Carregando...</span>
    </div>
  )

  if (count === 1) {
    return skeletonElement(0)
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => skeletonElement(index))}
    </div>
  )
}

// Card Skeleton preset
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#faf6ee] border border-[#1e130c]/10 p-8 ${className}`}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Skeleton variant="text" width="70%" height={28} className="mb-3" />
          <Skeleton variant="text" width="40%" height={18} />
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
      <div className="space-y-3">
        <Skeleton variant="text" count={3} />
      </div>
    </div>
  )
}

// Table Row Skeleton preset
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-[#1e130c]/5">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="py-6 px-4">
          <Skeleton variant="text" width={index === 0 ? '85%' : '65%'} />
        </td>
      ))}
    </tr>
  )
}

// Stat Card Skeleton preset
export function SkeletonStatCard() {
  return (
    <div className="bg-[#faf6ee] p-6 border border-[#1e130c]/10">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton variant="text" width="50%" height={14} className="mb-3" />
          <Skeleton variant="text" width="35%" height={36} className="mb-3" />
          <Skeleton variant="text" width="45%" height={12} />
        </div>
        <Skeleton variant="circular" width={52} height={52} />
      </div>
    </div>
  )
}

// Form Skeleton preset
export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-8">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton variant="text" width="25%" height={12} />
          <Skeleton variant="rectangular" height={44} />
        </div>
      ))}
      <div className="flex gap-6 pt-6">
        <Skeleton variant="button" width={140} height={48} />
        <Skeleton variant="button" width={140} height={48} />
      </div>
    </div>
  )
}
