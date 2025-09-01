import { format, formatDistance, formatRelative, isToday, isYesterday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Formata números com separadores de milhares
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Formata números de forma compacta (1K, 1M, etc)
 */
export function formatCompactNumber(value: number): string {
  if (value < 1000) return value.toString()
  if (value < 1000000) return `${(value / 1000).toFixed(1)}K`
  if (value < 1000000000) return `${(value / 1000000).toFixed(1)}M`
  return `${(value / 1000000000).toFixed(1)}B`
}

/**
 * Formata valores monetários
 */
export function formatCurrency(value: number, showCents: boolean = true): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  }).format(value)
}

/**
 * Formata percentuais
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`
}

/**
 * Formata datas em formato brasileiro
 */
export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: ptBR })
}

/**
 * Formata data e hora
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

/**
 * Formata data relativa (há 2 dias, ontem, etc)
 */
export function formatRelativeDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (isToday(dateObj)) {
    return `Hoje às ${format(dateObj, 'HH:mm', { locale: ptBR })}`
  }
  
  if (isYesterday(dateObj)) {
    return `Ontem às ${format(dateObj, 'HH:mm', { locale: ptBR })}`
  }
  
  // Para datas próximas (até 7 dias)
  const daysDiff = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff <= 7) {
    return formatDistance(dateObj, new Date(), { addSuffix: true, locale: ptBR })
  }
  
  // Para datas mais distantes
  return format(dateObj, 'dd/MM/yyyy', { locale: ptBR })
}

/**
 * Formata duração em formato legível
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (mins === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${mins}min`
}

/**
 * Formata bytes em formato legível
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Trunca texto com reticências
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

/**
 * Capitaliza primeira letra de cada palavra
 */
export function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, char => char.toUpperCase())
}

/**
 * Remove acentos de uma string
 */
export function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Formata CPF
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return cpf
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata CNPJ
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return cnpj
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/**
 * Formata telefone
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  
  return phone
}

/**
 * Formata CEP
 */
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, '')
  if (cleaned.length !== 8) return cep
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2')
}

/**
 * Gera cor baseada em string (para avatares, etc)
 */
export function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const hue = hash % 360
  return `hsl(${hue}, 70%, 50%)`
}

/**
 * Gera iniciais de um nome
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Formata status para exibição
 */
export function formatStatus(status: string): {
  label: string
  color: 'green' | 'red' | 'yellow' | 'blue' | 'gray'
} {
  const statusMap: Record<string, { label: string; color: 'green' | 'red' | 'yellow' | 'blue' | 'gray' }> = {
    active: { label: 'Ativo', color: 'green' },
    inactive: { label: 'Inativo', color: 'gray' },
    pending: { label: 'Pendente', color: 'yellow' },
    approved: { label: 'Aprovado', color: 'green' },
    rejected: { label: 'Rejeitado', color: 'red' },
    completed: { label: 'Concluído', color: 'green' },
    cancelled: { label: 'Cancelado', color: 'red' },
    processing: { label: 'Processando', color: 'blue' },
    draft: { label: 'Rascunho', color: 'gray' },
    published: { label: 'Publicado', color: 'blue' }
  }
  
  return statusMap[status] || { label: capitalizeWords(status), color: 'gray' }
}

/**
 * Calcula porcentagem de mudança
 */
export function calculateChangePercentage(oldValue: number, newValue: number): {
  value: number
  direction: 'up' | 'down' | 'neutral'
} {
  if (oldValue === 0) {
    return { value: 0, direction: 'neutral' }
  }
  
  const change = ((newValue - oldValue) / oldValue) * 100
  
  return {
    value: Math.abs(change),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  }
}

/**
 * Formata range de datas
 */
export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  
  const startFormatted = format(start, 'dd/MM/yyyy', { locale: ptBR })
  const endFormatted = format(end, 'dd/MM/yyyy', { locale: ptBR })
  
  return `${startFormatted} - ${endFormatted}`
}

/**
 * Valida email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida CPF
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '')
  
  if (cleaned.length !== 11) return false
  if (/^(\d)\1+$/.test(cleaned)) return false
  
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i)
  }
  
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleaned.charAt(9))) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i)
  }
  
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleaned.charAt(10))) return false
  
  return true
}

/**
 * Gera slug a partir de texto
 */
export function generateSlug(text: string): string {
  return removeAccents(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
}