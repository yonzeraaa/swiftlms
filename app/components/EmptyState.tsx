import { ReactNode } from 'react'
import { 
  FileX, 
  Search, 
  Users, 
  BookOpen, 
  FolderOpen, 
  Inbox,
  Database,
  Trophy,
  Calendar,
  MessageSquare,
  ShoppingBag,
  Image,
  FileQuestion,
  Sparkles
} from 'lucide-react'
import Button from './Button'

interface EmptyStateProps {
  variant?: 'default' | 'search' | 'error' | 'success' | 'no-data' | 'no-access' | 'coming-soon'
  title?: string
  description?: string
  icon?: ReactNode
  iconType?: 'files' | 'search' | 'users' | 'courses' | 'folder' | 'inbox' | 'database' | 'trophy' | 'calendar' | 'messages' | 'shop' | 'image' | 'custom'
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'outline'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
  className?: string
}

const iconMap = {
  files: FileX,
  search: Search,
  users: Users,
  courses: BookOpen,
  folder: FolderOpen,
  inbox: Inbox,
  database: Database,
  trophy: Trophy,
  calendar: Calendar,
  messages: MessageSquare,
  shop: ShoppingBag,
  image: Image,
  custom: FileQuestion
}

const defaultContent = {
  default: {
    title: 'Nenhum item encontrado',
    description: 'Ainda não há dados para exibir aqui.',
    iconType: 'inbox' as const
  },
  search: {
    title: 'Nenhum resultado encontrado',
    description: 'Tente ajustar seus filtros ou termos de busca.',
    iconType: 'search' as const
  },
  error: {
    title: 'Algo deu errado',
    description: 'Ocorreu um erro ao carregar os dados. Por favor, tente novamente.',
    iconType: 'files' as const
  },
  success: {
    title: 'Tudo pronto!',
    description: 'Sua configuração foi concluída com sucesso.',
    iconType: 'trophy' as const
  },
  'no-data': {
    title: 'Sem dados disponíveis',
    description: 'Comece adicionando alguns itens para vê-los aqui.',
    iconType: 'database' as const
  },
  'no-access': {
    title: 'Acesso restrito',
    description: 'Você não tem permissão para visualizar este conteúdo.',
    iconType: 'folder' as const
  },
  'coming-soon': {
    title: 'Em breve',
    description: 'Esta funcionalidade estará disponível em breve.',
    iconType: 'calendar' as const
  }
}

export default function EmptyState({
  variant = 'default',
  title,
  description,
  icon,
  iconType,
  action,
  secondaryAction,
  size = 'md',
  animate = true,
  className = ''
}: EmptyStateProps) {
  const content = defaultContent[variant]
  const finalTitle = title || content.title
  const finalDescription = description || content.description
  const finalIconType = iconType || content.iconType
  
  const IconComponent = iconMap[finalIconType]
  
  const sizes = {
    sm: {
      container: 'py-8 px-4',
      icon: 'w-16 h-16',
      title: 'text-lg',
      description: 'text-sm',
      spacing: 'space-y-3'
    },
    md: {
      container: 'py-12 px-6',
      icon: 'w-24 h-24',
      title: 'text-xl',
      description: 'text-base',
      spacing: 'space-y-4'
    },
    lg: {
      container: 'py-16 px-8',
      icon: 'w-32 h-32',
      title: 'text-2xl',
      description: 'text-lg',
      spacing: 'space-y-6'
    }
  }
  
  const currentSize = sizes[size]
  
  const variantStyles = {
    default: 'text-gold-300',
    search: 'text-gold-400',
    error: 'text-red-400',
    success: 'text-green-400',
    'no-data': 'text-gold-300',
    'no-access': 'text-gold-400',
    'coming-soon': 'text-purple-400'
  }

  return (
    <div className={`flex flex-col items-center justify-center ${currentSize.container} ${className}`}>
      <div className={`${currentSize.spacing} text-center max-w-md mx-auto`}>
        {/* Icon with animated background */}
        <div className={`relative inline-block ${animate ? 'animate-fade-in' : ''}`}>
          {/* Animated background circles */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`absolute ${currentSize.icon} rounded-full bg-gradient-to-br from-gold-500/10 to-transparent animate-pulse`} />
            <div className={`absolute ${currentSize.icon} rounded-full bg-gradient-to-tr from-gold-500/5 to-transparent animate-pulse animation-delay-500`} />
          </div>
          
          {/* Custom SVG Illustration or Icon */}
          {icon || (
            variant === 'coming-soon' ? (
              <div className="relative">
                <Sparkles className={`${currentSize.icon} ${variantStyles[variant]} animate-pulse`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-gold-400 rounded-full animate-ping" />
                </div>
              </div>
            ) : (
              <IconComponent className={`${currentSize.icon} ${variantStyles[variant]} relative z-10 ${animate ? 'animate-float' : ''}`} />
            )
          )}
        </div>
        
        {/* Title */}
        <h3 className={`${currentSize.title} font-bold text-gold ${animate ? 'animate-fade-in animation-delay-200' : ''}`}>
          {finalTitle}
        </h3>
        
        {/* Description */}
        <p className={`${currentSize.description} text-gold-300/80 ${animate ? 'animate-fade-in animation-delay-300' : ''}`}>
          {finalDescription}
        </p>
        
        {/* Actions */}
        {(action || secondaryAction) && (
          <div className={`flex flex-col sm:flex-row gap-3 justify-center items-center pt-2 ${animate ? 'animate-fade-in animation-delay-400' : ''}`}>
            {action && (
              <Button
                variant={action.variant || 'primary'}
                onClick={action.onClick}
                size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant="ghost"
                onClick={secondaryAction.onClick}
                size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Decorative elements */}
      {variant === 'success' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl animate-pulse animation-delay-1000" />
        </div>
      )}
      
      {variant === 'error' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/5 rounded-full blur-3xl animate-pulse" />
        </div>
      )}
    </div>
  )
}

// Preset components for common use cases
export function EmptySearch({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      variant="search"
      action={onClear ? { label: 'Limpar filtros', onClick: onClear } : undefined}
    />
  )
}

export function EmptyData({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      variant="no-data"
      action={onCreate ? { label: 'Criar primeiro item', onClick: onCreate } : undefined}
    />
  )
}

export function EmptyError({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      variant="error"
      action={onRetry ? { label: 'Tentar novamente', onClick: onRetry, variant: 'primary' } : undefined}
    />
  )
}

export function EmptySuccess({ onContinue }: { onContinue?: () => void }) {
  return (
    <EmptyState
      variant="success"
      action={onContinue ? { label: 'Continuar', onClick: onContinue } : undefined}
    />
  )
}

export function ComingSoon() {
  return (
    <EmptyState
      variant="coming-soon"
      size="lg"
    />
  )
}

// Custom illustration component
export function CustomEmptyIllustration() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="w-32 h-32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="100" r="80" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <circle cx="100" cy="100" r="60" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="40" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      <path
        d="M100 60 L120 90 L110 90 L110 120 L90 120 L90 90 L80 90 Z"
        fill="currentColor"
        fillOpacity="0.5"
      />
      <circle cx="100" cy="140" r="5" fill="currentColor" fillOpacity="0.6" />
    </svg>
  )
}