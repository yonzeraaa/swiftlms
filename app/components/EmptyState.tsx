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
} from 'lucide-react'
import Button from './Button'

const INK = '#1e130c'
const ACCENT = '#8b6d22'
const MUTED = '#7a6350'

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
  custom: FileQuestion,
}

const defaultContent = {
  default:      { title: 'Nenhum item encontrado',   description: 'Ainda não há dados para exibir aqui.',                                iconType: 'inbox'    as const },
  search:       { title: 'Nenhum resultado',          description: 'Tente ajustar seus filtros ou termos de busca.',                       iconType: 'search'   as const },
  error:        { title: 'Algo deu errado',           description: 'Ocorreu um erro ao carregar os dados. Tente novamente.',              iconType: 'files'    as const },
  success:      { title: 'Tudo pronto!',              description: 'Sua configuração foi concluída com sucesso.',                          iconType: 'trophy'   as const },
  'no-data':    { title: 'Sem dados disponíveis',     description: 'Comece adicionando alguns itens para vê-los aqui.',                   iconType: 'database' as const },
  'no-access':  { title: 'Acesso restrito',           description: 'Você não tem permissão para visualizar este conteúdo.',               iconType: 'folder'   as const },
  'coming-soon':{ title: 'Em breve',                  description: 'Esta funcionalidade estará disponível em breve.',                     iconType: 'calendar' as const },
}

interface EmptyStateProps {
  variant?: 'default' | 'search' | 'error' | 'success' | 'no-data' | 'no-access' | 'coming-soon'
  title?: string
  description?: string
  icon?: ReactNode
  iconType?: keyof typeof iconMap
  action?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'outline' }
  secondaryAction?: { label: string; onClick: () => void }
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
  className?: string
}

const containerPadding = { sm: '2rem 1rem', md: '3rem 1.5rem', lg: '4rem 2rem' }
const iconSize          = { sm: 40, md: 56, lg: 72 }
const titleSize         = { sm: '1rem', md: '1.2rem', lg: '1.4rem' }
const descSize          = { sm: '0.85rem', md: '0.95rem', lg: '1.05rem' }

export default function EmptyState({
  variant = 'default',
  title,
  description,
  icon,
  iconType,
  action,
  secondaryAction,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const content = defaultContent[variant]
  const finalTitle = title || content.title
  const finalDescription = description || content.description
  const finalIconType = iconType || content.iconType
  const IconComponent = iconMap[finalIconType]

  const iconColor = variant === 'error' ? '#7b1d1d' : variant === 'success' ? '#1e130c' : ACCENT

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: containerPadding[size],
        textAlign: 'center',
      }}
    >
      {/* Icon */}
      <div style={{ color: iconColor, opacity: 0.6, marginBottom: '1rem' }}>
        {icon || <IconComponent size={iconSize[size]} strokeWidth={1.2} />}
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: 'var(--font-playfair, serif)',
          fontSize: titleSize[size],
          fontWeight: 600,
          color: INK,
          margin: '0 0 0.5rem',
        }}
      >
        {finalTitle}
      </h3>

      {/* Description */}
      <p
        style={{
          fontFamily: 'var(--font-lora, serif)',
          fontSize: descSize[size],
          fontStyle: 'italic',
          color: MUTED,
          margin: '0 0 1.25rem',
          maxWidth: 360,
        }}
      >
        {finalDescription}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {action && (
            <Button
              variant={action.variant || 'primary'}
              size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" size="md" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function EmptySearch({ onClear }: { onClear?: () => void }) {
  return <EmptyState variant="search" action={onClear ? { label: 'Limpar filtros', onClick: onClear } : undefined} />
}

export function EmptyData({ onCreate }: { onCreate?: () => void }) {
  return <EmptyState variant="no-data" action={onCreate ? { label: 'Criar primeiro item', onClick: onCreate } : undefined} />
}

export function EmptyError({ onRetry }: { onRetry?: () => void }) {
  return <EmptyState variant="error" action={onRetry ? { label: 'Tentar novamente', onClick: onRetry } : undefined} />
}

export function EmptySuccess({ onContinue }: { onContinue?: () => void }) {
  return <EmptyState variant="success" action={onContinue ? { label: 'Continuar', onClick: onContinue } : undefined} />
}

export function ComingSoon() {
  return <EmptyState variant="coming-soon" size="lg" />
}

export function CustomEmptyIllustration() {
  return (
    <svg viewBox="0 0 200 200" style={{ width: 128, height: 128 }} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <circle cx="100" cy="100" r="60" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="40" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      <path d="M100 60 L120 90 L110 90 L110 120 L90 120 L90 90 L80 90 Z" fill="currentColor" fillOpacity="0.5" />
      <circle cx="100" cy="140" r="5" fill="currentColor" fillOpacity="0.6" />
    </svg>
  )
}
