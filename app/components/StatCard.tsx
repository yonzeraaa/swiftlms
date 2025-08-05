import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
}

export default function StatCard({ title, value, icon, trend, subtitle }: StatCardProps) {
  return (
    <div className="glass-morphism border-gradient rounded-xl p-1">
      <div className="bg-navy-800/90 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-gold-300 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-gold mt-2">{value}</p>
            
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                trend.isPositive ? 'text-green-400' : 'text-red-400'
              }`}>
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
            
            {subtitle && (
              <p className="text-gold-400/60 text-xs mt-1">{subtitle}</p>
            )}
          </div>
          
          <div className="p-3 bg-gold-500/10 rounded-lg text-gold-400">
            {icon}
          </div>
        </div>
      </div>
    </div>
  )
}