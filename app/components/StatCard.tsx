import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
  variant?: 'default' | 'gradient' | 'minimal'
  color?: 'gold' | 'blue' | 'green' | 'purple' | 'red'
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle,
  variant = 'default',
  color = 'gold'
}: StatCardProps) {
  const colorSchemes = {
    gold: {
      gradient: 'from-gold-500/20 to-gold-600/10',
      icon: 'bg-gold-500/10 text-gold-400',
      iconHover: 'group-hover:bg-gold-500/20',
      text: 'text-gold',
      subtitle: 'text-gold-300'
    },
    blue: {
      gradient: 'from-blue-500/20 to-blue-600/10',
      icon: 'bg-blue-500/10 text-blue-400',
      iconHover: 'group-hover:bg-blue-500/20',
      text: 'text-blue-400',
      subtitle: 'text-blue-300'
    },
    green: {
      gradient: 'from-green-500/20 to-green-600/10',
      icon: 'bg-green-500/10 text-green-400',
      iconHover: 'group-hover:bg-green-500/20',
      text: 'text-green-400',
      subtitle: 'text-green-300'
    },
    purple: {
      gradient: 'from-purple-500/20 to-purple-600/10',
      icon: 'bg-purple-500/10 text-purple-400',
      iconHover: 'group-hover:bg-purple-500/20',
      text: 'text-purple-400',
      subtitle: 'text-purple-300'
    },
    red: {
      gradient: 'from-red-500/20 to-red-600/10',
      icon: 'bg-red-500/10 text-red-400',
      iconHover: 'group-hover:bg-red-500/20',
      text: 'text-red-400',
      subtitle: 'text-red-300'
    }
  }

  const scheme = colorSchemes[color]

  const variants = {
    default: 'bg-navy-800/90 border border-gold-500/20 hover:border-gold-500/30',
    gradient: `bg-gradient-to-br ${scheme.gradient} backdrop-blur-xl border border-gold-500/10`,
    minimal: 'bg-transparent border-0'
  }

  return (
    <div className="group relative">
      {/* Glow effect on hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-gold-500/20 to-gold-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
      
      <div className={`
        relative rounded-2xl p-6
        transform transition-all duration-300
        hover:scale-[1.02] hover:-translate-y-1
        ${variants[variant]}
        shadow-lg hover:shadow-2xl
      `}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-sm font-medium ${scheme.subtitle} opacity-90`}>{title}</p>
            <p className={`text-3xl font-bold mt-2 ${scheme.text} tracking-tight`}>
              <span className="inline-block transition-transform duration-300 group-hover:scale-110">
                {value}
              </span>
            </p>
            
            
            {subtitle && (
              <p className="text-gold-400/60 text-xs mt-2">{subtitle}</p>
            )}
          </div>
          
          <div className={`
            p-3 rounded-xl transition-all duration-300
            ${scheme.icon} ${scheme.iconHover}
            transform group-hover:rotate-12 group-hover:scale-110
          `}>
            {icon}
          </div>
        </div>

        {/* Animated gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="h-full bg-gradient-to-r from-gold-500 to-gold-600 animate-shimmer"></div>
        </div>
      </div>
    </div>
  )
}