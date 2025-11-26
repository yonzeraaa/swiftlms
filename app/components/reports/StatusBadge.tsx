'use client'

import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  Loader2,
  CircleDot,
  Ban,
  PlayCircle,
  PauseCircle
} from 'lucide-react'

export type StatusType = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'pending' 
  | 'processing'
  | 'inactive'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'approved'
  | 'rejected'
  | 'draft'
  | 'published'
  | 'custom'

interface StatusBadgeProps {
  status: StatusType | string
  label?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'solid' | 'outline' | 'soft'
  icon?: boolean | React.ReactNode
  pulse?: boolean
  className?: string
  customColor?: {
    bg: string
    text: string
    border?: string
  }
}

export default function StatusBadge({
  status,
  label,
  size = 'sm',
  variant = 'soft',
  icon = true,
  pulse = false,
  className = '',
  customColor
}: StatusBadgeProps) {
  // Configurações de status
  const statusConfig: Record<string, {
    label: string
    icon: React.ReactNode
    colors: {
      solid: string
      outline: string
      soft: string
    }
  }> = {
    success: {
      label: 'Sucesso',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-green-500 text-white border-green-500',
        outline: 'border-green-500 text-green-400 bg-transparent',
        soft: 'bg-green-500/20 text-green-400 border-green-500/30'
      }
    },
    error: {
      label: 'Erro',
      icon: <XCircle className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-red-500 text-white border-red-500',
        outline: 'border-red-500 text-red-400 bg-transparent',
        soft: 'bg-red-500/20 text-red-400 border-red-500/30'
      }
    },
    warning: {
      label: 'Atenção',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-yellow-500 text-white border-yellow-500',
        outline: 'border-yellow-500 text-yellow-400 bg-transparent',
        soft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      }
    },
    pending: {
      label: 'Pendente',
      icon: <Clock className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-orange-500 text-white border-orange-500',
        outline: 'border-orange-500 text-orange-400 bg-transparent',
        soft: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      }
    },
    processing: {
      label: 'Processando',
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      colors: {
        solid: 'bg-blue-500 text-white border-blue-500',
        outline: 'border-blue-500 text-blue-400 bg-transparent',
        soft: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      }
    },
    inactive: {
      label: 'Inativo',
      icon: <Ban className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-gray-500 text-white border-gray-500',
        outline: 'border-gray-500 text-gray-400 bg-transparent',
        soft: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      }
    },
    active: {
      label: 'Ativo',
      icon: <PlayCircle className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-green-500 text-white border-green-500',
        outline: 'border-green-500 text-green-400 bg-transparent',
        soft: 'bg-green-500/20 text-green-400 border-green-500/30'
      }
    },
    paused: {
      label: 'Pausado',
      icon: <PauseCircle className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-yellow-500 text-white border-yellow-500',
        outline: 'border-yellow-500 text-yellow-400 bg-transparent',
        soft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      }
    },
    completed: {
      label: 'Concluído',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-green-500 text-white border-green-500',
        outline: 'border-green-500 text-green-400 bg-transparent',
        soft: 'bg-green-500/20 text-green-400 border-green-500/30'
      }
    },
    cancelled: {
      label: 'Cancelado',
      icon: <XCircle className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-red-500 text-white border-red-500',
        outline: 'border-red-500 text-red-400 bg-transparent',
        soft: 'bg-red-500/20 text-red-400 border-red-500/30'
      }
    },
    approved: {
      label: 'Aprovado',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-green-500 text-white border-green-500',
        outline: 'border-green-500 text-green-400 bg-transparent',
        soft: 'bg-green-500/20 text-green-400 border-green-500/30'
      }
    },
    rejected: {
      label: 'Rejeitado',
      icon: <XCircle className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-red-500 text-white border-red-500',
        outline: 'border-red-500 text-red-400 bg-transparent',
        soft: 'bg-red-500/20 text-red-400 border-red-500/30'
      }
    },
    draft: {
      label: 'Rascunho',
      icon: <CircleDot className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-gray-500 text-white border-gray-500',
        outline: 'border-gray-500 text-gray-400 bg-transparent',
        soft: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      }
    },
    published: {
      label: 'Publicado',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      colors: {
        solid: 'bg-blue-500 text-white border-blue-500',
        outline: 'border-blue-500 text-blue-400 bg-transparent',
        soft: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      }
    },
    custom: {
      label: label || status,
      icon: typeof icon === 'boolean' ? <CircleDot className="w-3.5 h-3.5" /> : icon,
      colors: {
        solid: customColor ? `${customColor.bg} ${customColor.text} ${customColor.border || ''}` : 'bg-gold-500 text-white border-gold-500',
        outline: customColor ? `${customColor.border || 'border-gold-500'} ${customColor.text} bg-transparent` : 'border-gold-500 text-gold-400 bg-transparent',
        soft: customColor ? `${customColor.bg} ${customColor.text} ${customColor.border || ''}` : 'bg-gold-500/20 text-gold-400 border-gold-500/30'
      }
    }
  }

  // Mapear status em português para inglês
  const statusMap: Record<string, StatusType> = {
    'ativo': 'active',
    'inativo': 'inactive',
    'pendente': 'pending',
    'aprovado': 'approved',
    'rejeitado': 'rejected',
    'concluído': 'completed',
    'concluido': 'completed',
    'cancelado': 'cancelled',
    'pausado': 'paused',
    'processando': 'processing',
    'rascunho': 'draft',
    'publicado': 'published',
    'sucesso': 'success',
    'erro': 'error',
    'atenção': 'warning',
    'atencao': 'warning'
  }

  // Normalizar status
  const normalizedStatus = statusMap[status.toLowerCase()] || status.toLowerCase()
  const config = statusConfig[normalizedStatus] || statusConfig.custom
  const displayLabel = label || config.label

  // Classes de tamanho
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2.5'
  }

  // Determinar se deve mostrar ícone
  const showIcon = icon !== false && (icon === true || icon !== undefined)
  const iconElement = typeof icon === 'boolean' ? config.icon : icon

  return (
    <span
      className={`
        inline-flex items-center
        ${sizeClasses[size]}
        ${config.colors[variant]}
        border rounded-full font-medium
        transition-all duration-200
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {showIcon && iconElement && (
        <span className="flex-shrink-0">
          {iconElement}
        </span>
      )}
      <span className="whitespace-nowrap">
        {displayLabel}
      </span>
      {pulse && normalizedStatus === 'processing' && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
      )}
    </span>
  )
}