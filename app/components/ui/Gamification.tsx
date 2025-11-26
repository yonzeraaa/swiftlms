'use client'

import { motion } from 'framer-motion'
import { ReactNode, useState } from 'react'
import { 
  Trophy, 
  Star, 
  Target, 
  Zap, 
  Award, 
  TrendingUp,
  Flame,
  Crown,
  Medal,
  Gift,
  Heart,
  Shield,
  CheckCircle2
} from 'lucide-react'
import ProgressRing from './ProgressRing'
import confetti from 'canvas-confetti'

// XP Bar Component
interface XPBarProps {
  currentXP: number
  requiredXP: number
  level: number
  animated?: boolean
  showMilestones?: boolean
  className?: string
}

export function XPBar({
  currentXP,
  requiredXP,
  level,
  animated = true,
  showMilestones = true,
  className = ''
}: XPBarProps) {
  const percentage = (currentXP / requiredXP) * 100
  const milestones = [25, 50, 75]

  return (
    <div className={`relative ${className}`}>
      {/* Level Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-gold-500/30 to-gold-600/20 border-2 border-gold-500/50">
            <span className="text-sm font-bold text-gold">Lv {level}</span>
          </div>
          <div>
            <p className="text-xs text-gold-300/70">Nível Atual</p>
            <p className="text-sm font-semibold text-gold-200">
              {currentXP.toLocaleString()} / {requiredXP.toLocaleString()} XP
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gold-300/70">Próximo Nível</p>
          <p className="text-sm font-semibold text-gold">
            {(requiredXP - currentXP).toLocaleString()} XP
          </p>
        </div>
      </div>

      {/* XP Bar */}
      <div className="relative h-6 bg-navy-800/50 rounded-full overflow-hidden border border-gold-500/20">
        {/* Milestones */}
        {showMilestones && milestones.map((milestone) => (
          <div
            key={milestone}
            className="absolute top-0 bottom-0 w-px bg-gold-500/30"
            style={{ left: `${milestone}%` }}
          />
        ))}

        {/* Progress */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold-500 to-gold-400"
          initial={{ width: animated ? '0%' : `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </motion.div>

        {/* XP Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gold-200">
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

// Achievement Badge Component
interface AchievementBadgeProps {
  title: string
  description: string
  icon?: ReactNode
  unlocked?: boolean
  progress?: number
  maxProgress?: number
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
}

export function AchievementBadge({
  title,
  description,
  icon,
  unlocked = false,
  progress,
  maxProgress,
  rarity = 'common',
  size = 'md',
  onClick,
  className = ''
}: AchievementBadgeProps) {
  const [isHovered, setIsHovered] = useState(false)

  const rarityColors = {
    common: 'from-gray-500 to-gray-600',
    rare: 'from-blue-500 to-blue-600',
    epic: 'from-purple-500 to-purple-600',
    legendary: 'from-gold-500 to-gold-600'
  }

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  }

  const handleClick = () => {
    if (unlocked && onClick) {
      onClick()
      // Celebration effect for legendary achievements
      if (rarity === 'legendary') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      }
    }
  }

  return (
    <motion.div
      className={`relative cursor-pointer ${className}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Badge */}
      <div className={`
        relative ${sizeClasses[size]} rounded-full
        ${unlocked 
          ? `bg-gradient-to-br ${rarityColors[rarity]} shadow-lg` 
          : 'bg-navy-800/50 border-2 border-gold-500/10'
        }
        transition-all duration-300
      `}>
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {icon || <Trophy className={`${size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10'} ${unlocked ? 'text-white' : 'text-gold-300/30'}`} />}
        </div>

        {/* Progress Ring */}
        {progress !== undefined && maxProgress && !unlocked && (
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-gold-500/30"
              strokeDasharray={`${(progress / maxProgress) * 100} 100`}
            />
          </svg>
        )}

        {/* Shine Effect */}
        {unlocked && (
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 to-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>

      {/* Tooltip */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-10 bottom-full mb-2 left-1/2 -translate-x-1/2"
        >
          <div className="bg-navy-800 border border-gold-500/30 rounded-lg p-3 shadow-xl whitespace-nowrap">
            <h4 className="text-sm font-semibold text-gold mb-1">{title}</h4>
            <p className="text-xs text-gold-300/70">{description}</p>
            {progress !== undefined && maxProgress && !unlocked && (
              <p className="text-xs text-gold-400 mt-1">
                Progresso: {progress}/{maxProgress}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// Streak Counter Component
interface StreakCounterProps {
  currentStreak: number
  bestStreak: number
  streakTarget?: number
  showFire?: boolean
  className?: string
}

export function StreakCounter({
  currentStreak,
  bestStreak,
  streakTarget = 7,
  showFire = true,
  className = ''
}: StreakCounterProps) {
  const isOnFire = currentStreak >= streakTarget
  const fireIntensity = Math.min(currentStreak / streakTarget, 3)

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Current Streak */}
      <div className="relative">
        <motion.div
          className={`
            flex items-center justify-center w-20 h-20 rounded-2xl
            ${isOnFire 
              ? 'bg-gradient-to-br from-orange-500/30 to-red-500/30 border-2 border-orange-500/50' 
              : 'bg-navy-800/50 border-2 border-gold-500/20'
            }
          `}
          animate={isOnFire ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="text-center">
            <p className={`text-2xl font-bold ${isOnFire ? 'text-orange-400' : 'text-gold'}`}>
              {currentStreak}
            </p>
            <p className="text-xs text-gold-300/70">dias</p>
          </div>
        </motion.div>

        {/* Fire Effect */}
        {showFire && isOnFire && (
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <Flame className={`w-6 h-6 text-orange-400`} style={{ opacity: fireIntensity }} />
          </motion.div>
        )}
      </div>

      {/* Stats */}
      <div>
        <p className="text-sm text-gold-200">Sequência Atual</p>
        <p className="text-xs text-gold-300/70 mt-1">
          Melhor: <span className="text-gold-400 font-semibold">{bestStreak} dias</span>
        </p>
        {currentStreak > 0 && currentStreak < streakTarget && (
          <p className="text-xs text-gold-300/70">
            Mais {streakTarget - currentStreak} dias para bônus!
          </p>
        )}
      </div>
    </div>
  )
}

// Leaderboard Component
interface LeaderboardEntry {
  rank: number
  name: string
  avatar?: string
  score: number
  trend?: 'up' | 'down' | 'same'
  isCurrentUser?: boolean
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  title?: string
  showTrend?: boolean
  className?: string
}

export function Leaderboard({
  entries,
  title = 'Ranking',
  showTrend = true,
  className = ''
}: LeaderboardProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-gold-400" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Medal className="w-5 h-5 text-orange-400" />
      default:
        return <span className="text-sm font-semibold text-gold-300">#{rank}</span>
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gold mb-4">{title}</h3>
      )}

      {entries.map((entry, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`
            flex items-center gap-3 p-3 rounded-lg
            ${entry.isCurrentUser 
              ? 'bg-gold-500/20 border border-gold-500/30' 
              : 'bg-navy-800/30 hover:bg-navy-800/50'
            }
            transition-all
          `}
        >
          {/* Rank */}
          <div className="w-8 flex justify-center">
            {getRankIcon(entry.rank)}
          </div>

          {/* Avatar */}
          {entry.avatar ? (
            <img src={entry.avatar} alt={entry.name} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-500/30 to-gold-600/20 flex items-center justify-center">
              <span className="text-xs font-semibold text-gold">
                {entry.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Name */}
          <div className="flex-1">
            <p className={`text-sm font-medium ${entry.isCurrentUser ? 'text-gold' : 'text-gold-200'}`}>
              {entry.name}
              {entry.isCurrentUser && <span className="ml-1 text-xs">(Você)</span>}
            </p>
          </div>

          {/* Trend */}
          {showTrend && entry.trend && (
            <div className="mr-2">
              {entry.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
              {entry.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />}
              {entry.trend === 'same' && <div className="w-4 h-4 border-t-2 border-gold-300/50" />}
            </div>
          )}

          {/* Score */}
          <div className="text-right">
            <p className="text-sm font-bold text-gold">{entry.score.toLocaleString()}</p>
            <p className="text-xs text-gold-300/50">pontos</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Quest/Mission Card Component
interface QuestProps {
  title: string
  description: string
  reward: {
    xp?: number
    coins?: number
    badge?: string
  }
  progress: number
  total: number
  deadline?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  completed?: boolean
  className?: string
}

export function QuestCard({
  title,
  description,
  reward,
  progress,
  total,
  deadline,
  difficulty = 'medium',
  completed = false,
  className = ''
}: QuestProps) {
  const percentage = (progress / total) * 100
  const difficultyColors = {
    easy: 'text-green-400',
    medium: 'text-yellow-400',
    hard: 'text-red-400'
  }

  return (
    <motion.div
      className={`
        p-4 rounded-xl border transition-all
        ${completed 
          ? 'bg-green-500/10 border-green-500/30' 
          : 'bg-navy-800/50 border-gold-500/20 hover:border-gold-500/40'
        }
        ${className}
      `}
      whileHover={{ scale: completed ? 1 : 1.02 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-gold flex items-center gap-2">
            {completed && <CheckCircle2 className="w-4 h-4 text-green-400" />}
            {title}
          </h4>
          <p className="text-xs text-gold-300/70 mt-1">{description}</p>
        </div>
        {difficulty && (
          <span className={`text-xs font-medium ${difficultyColors[difficulty]}`}>
            {difficulty.toUpperCase()}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {!completed && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gold-300/70 mb-1">
            <span>Progresso</span>
            <span>{progress}/{total}</span>
          </div>
          <div className="h-2 bg-navy-700/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-gold-500 to-gold-400"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Rewards */}
        <div className="flex items-center gap-3">
          {reward.xp && (
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-gold-400" />
              <span className="text-xs text-gold-300">{reward.xp} XP</span>
            </div>
          )}
          {reward.coins && (
            <div className="flex items-center gap-1">
              <Gift className="w-3 h-3 text-gold-400" />
              <span className="text-xs text-gold-300">{reward.coins} moedas</span>
            </div>
          )}
          {reward.badge && (
            <div className="flex items-center gap-1">
              <Award className="w-3 h-3 text-gold-400" />
              <span className="text-xs text-gold-300">{reward.badge}</span>
            </div>
          )}
        </div>

        {/* Deadline */}
        {deadline && !completed && (
          <span className="text-xs text-gold-300/50">
            {deadline}
          </span>
        )}
      </div>
    </motion.div>
  )
}