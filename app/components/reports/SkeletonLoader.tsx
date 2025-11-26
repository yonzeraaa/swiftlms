'use client'

interface SkeletonLoaderProps {
  type?: 'card' | 'table' | 'metric' | 'text' | 'button'
  count?: number
  className?: string
}

export default function SkeletonLoader({ 
  type = 'text', 
  count = 1, 
  className = '' 
}: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'metric':
        return (
          <div className={`p-6 bg-navy-900/30 border border-gold-500/10 rounded-xl ${className}`}>
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gold-500/10 rounded w-24"></div>
              <div className="h-8 bg-gold-500/20 rounded w-32"></div>
              <div className="h-3 bg-gold-500/10 rounded w-20"></div>
            </div>
          </div>
        )
      
      case 'card':
        return (
          <div className={`p-6 bg-navy-900/30 border border-gold-500/10 rounded-xl ${className}`}>
            <div className="animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 bg-gold-500/20 rounded w-32"></div>
                <div className="h-8 w-8 bg-gold-500/10 rounded-lg"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gold-500/10 rounded w-full"></div>
                <div className="h-4 bg-gold-500/10 rounded w-3/4"></div>
              </div>
              <div className="h-10 bg-gold-500/20 rounded-lg w-full"></div>
            </div>
          </div>
        )
      
      case 'table':
        return (
          <div className={`bg-navy-900/30 border border-gold-500/10 rounded-xl overflow-hidden ${className}`}>
            <div className="animate-pulse">
              {/* Header */}
              <div className="border-b border-gold-500/10 p-4 bg-navy-800/50">
                <div className="flex items-center gap-4">
                  <div className="h-4 bg-gold-500/20 rounded w-24"></div>
                  <div className="h-4 bg-gold-500/20 rounded w-32"></div>
                  <div className="h-4 bg-gold-500/20 rounded w-28 ml-auto"></div>
                </div>
              </div>
              {/* Rows */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-b border-gold-500/5 p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-4 bg-gold-500/10 rounded w-1/3"></div>
                    <div className="h-4 bg-gold-500/10 rounded w-1/4"></div>
                    <div className="h-4 bg-gold-500/10 rounded w-1/5 ml-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      
      case 'button':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="h-10 bg-gold-500/20 rounded-lg w-full"></div>
          </div>
        )
      
      case 'text':
      default:
        return (
          <div className={`animate-pulse space-y-2 ${className}`}>
            <div className="h-4 bg-gold-500/10 rounded w-full"></div>
            <div className="h-4 bg-gold-500/10 rounded w-3/4"></div>
            <div className="h-4 bg-gold-500/10 rounded w-1/2"></div>
          </div>
        )
    }
  }

  return (
    <>
      {[...Array(count)].map((_, index) => (
        <div key={index}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  )
}