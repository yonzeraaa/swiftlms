import { 
  User, Mail, Phone, Calendar, Shield, MoreVertical, 
  Edit, Trash2, Lock, Unlock, Award, GraduationCap,
  BookOpen, FileCheck, Users, TrendingUp, Clock
} from 'lucide-react'
import Card from './Card'
import Badge from './Badge'
import Button from './Button'
import Tooltip from './Tooltip'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface UserCardProps {
  user: {
    id: string
    email: string
    full_name?: string
    role: 'admin' | 'teacher' | 'instructor' | 'student'
    created_at: string
    is_active: boolean
    courses?: Array<{ id: string; title: string }>
    enrollments?: Array<{ id: string }>
    tests_created?: Array<{ id: string }>
    test_attempts?: Array<{ 
      id: string
      score?: number
      status: string
    }>
  }
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}

export default function UserCard({ 
  user, 
  onEdit, 
  onToggleActive, 
  onDelete 
}: UserCardProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'purple'
      case 'teacher': return 'blue'
      case 'instructor': return 'blue'
      case 'student': return 'green'
      default: return 'gold'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador'
      case 'teacher': return 'Professor'
      case 'instructor': return 'Professor'
      case 'student': return 'Aluno'
      default: return role
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />
      case 'teacher': return <GraduationCap className="w-4 h-4" />
      case 'instructor': return <GraduationCap className="w-4 h-4" />
      case 'student': return <BookOpen className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const calculateAverageScore = (attempts: typeof user.test_attempts) => {
    if (!attempts || attempts.length === 0) return 0
    const completedAttempts = attempts.filter(a => a.status === 'completed' && a.score)
    if (completedAttempts.length === 0) return 0
    const sum = completedAttempts.reduce((acc, a) => acc + (a.score || 0), 0)
    return Math.round(sum / completedAttempts.length)
  }

  const averageScore = user.role === 'student' ? calculateAverageScore(user.test_attempts) : 0
  const attemptCount = user.test_attempts?.length || 0
  const coursesCount = user.courses?.length || user.enrollments?.length || 0
  const testsCreatedCount = user.tests_created?.length || 0

  // Get initials for avatar
  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase()

  // Generate avatar background color based on email
  const avatarColorIndex = user.email.charCodeAt(0) % 5
  const avatarColors = [
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-green-500 to-green-600',
    'bg-gradient-to-br from-orange-500 to-orange-600',
    'bg-gradient-to-br from-pink-500 to-pink-600'
  ]

  return (
    <Card 
      variant="elevated"
      hoverable
      className="group relative overflow-hidden"
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4 z-10">
        <Badge 
          variant={user.is_active ? 'success' : 'error'}
          size="sm"
          animate={!user.is_active}
        >
          {user.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      {/* Header with Avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 rounded-full ${avatarColors[avatarColorIndex]} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
          {initials}
        </div>
        <div className="flex-1 pr-16">
          <h3 className="text-lg font-bold text-gold line-clamp-1 group-hover:text-gold-300 transition-colors">
            {user.full_name || 'Usuário sem nome'}
          </h3>
          <p className="text-sm text-gold-400 line-clamp-1">{user.email}</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="mb-4">
        <Badge 
          variant={user.role === 'admin' ? 'gradient' : user.role === 'student' ? 'success' : 'info'} 
          size="md"
          icon={getRoleIcon(user.role)}
        >
          {getRoleLabel(user.role)}
        </Badge>
      </div>

      {/* Stats Grid based on role */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {user.role === 'student' ? (
          <>
            <div className="bg-navy-900/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-gold-500" />
                <span className="text-xs text-gold-400">Cursos</span>
              </div>
              <p className="text-xl font-bold text-gold">{coursesCount}</p>
            </div>

            <div className="bg-navy-900/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileCheck className="w-4 h-4 text-gold-500" />
                <span className="text-xs text-gold-400">Tentativas</span>
              </div>
              <p className="text-xl font-bold text-gold">{attemptCount}</p>
            </div>

            <div className="bg-navy-900/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-gold-500" />
                <span className="text-xs text-gold-400">Média</span>
              </div>
              <p className={`text-sm font-medium ${
                averageScore >= 70 ? 'text-green-400' :
                averageScore >= 50 ? 'text-yellow-400' : 
                attemptCount > 0 ? 'text-red-400' : 'text-gold-500'
              }`}>
                {attemptCount > 0 ? `${averageScore}%` : '-'}
              </p>
            </div>

            <div className="bg-navy-900/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-gold-500" />
                <span className="text-xs text-gold-400">Aprovações</span>
              </div>
              <p className="text-sm font-medium text-gold">
                {user.test_attempts?.filter(a => a.status === 'completed' && (a.score || 0) >= 70).length || 0}
              </p>
            </div>
          </>
        ) : (user.role === 'teacher' || user.role === 'instructor') ? (
          <>
            <div className="bg-navy-900/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-gold-500" />
                <span className="text-xs text-gold-400">Cursos</span>
              </div>
              <p className="text-xl font-bold text-gold">{coursesCount}</p>
            </div>

            <div className="bg-navy-900/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileCheck className="w-4 h-4 text-gold-500" />
                <span className="text-xs text-gold-400">Testes</span>
              </div>
              <p className="text-xl font-bold text-gold">{testsCreatedCount}</p>
            </div>

            <div className="bg-navy-900/30 rounded-lg p-3 col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gold-500" />
                <span className="text-xs text-gold-400">Alunos</span>
              </div>
              <p className="text-sm text-gold-300">Ver detalhes dos cursos</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-navy-900/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gold-500" />
                <span className="text-xs text-gold-400">Total Usuários</span>
              </div>
              <p className="text-sm text-gold-300">Acesso completo</p>
            </div>

            <div className="bg-navy-900/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-gold-500" />
                <span className="text-xs text-gold-400">Permissões</span>
              </div>
              <p className="text-sm text-gold-300">Todas</p>
            </div>
          </>
        )}
      </div>

      {/* Member Since */}
      <div className="flex items-center gap-2 text-xs text-gold-400 mb-4">
        <Calendar className="w-3 h-3" />
        <span>
          Membro há {formatDistanceToNow(new Date(user.created_at), { 
            addSuffix: false, 
            locale: ptBR 
          })}
        </span>
      </div>

      {/* Progress Bar for Students */}
      {user.role === 'student' && attemptCount > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gold-400">Taxa de Sucesso</span>
            <span className="text-xs text-gold-300">{averageScore}%</span>
          </div>
          <div className="w-full bg-navy-900/50 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                averageScore >= 70 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                averageScore >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                'bg-gradient-to-r from-red-500 to-red-400'
              }`}
              style={{ width: `${averageScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-4 border-t border-gold-500/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          icon={<Edit className="w-4 h-4" />}
        >
          Editar
        </Button>

        <div className="flex items-center gap-1">
          <Tooltip content={user.is_active ? 'Desativar' : 'Ativar'}>
            <button
              onClick={onToggleActive}
              className="p-2 text-gold-400 hover:text-gold-200 hover:bg-gold-500/10 rounded-lg transition-all"
            >
              {user.is_active ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
            </button>
          </Tooltip>

          <Tooltip content="Excluir">
            <button
              onClick={onDelete}
              className="p-2 text-red-400 hover:text-red-200 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Decorative gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Card>
  )
}