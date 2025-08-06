import { ReactNode } from 'react'
import { 
  Clock, Users, FileQuestion, BookOpen, BarChart3, 
  MoreVertical, Eye, Edit, Copy, Trash2, ToggleLeft, 
  ToggleRight, CheckCircle2, AlertCircle, TrendingUp
} from 'lucide-react'
import Card from './Card'
import Badge from './Badge'
import Button from './Button'
import Tooltip from './Tooltip'

interface TestCardProps {
  test: {
    id: string
    title: string
    description?: string
    test_type: 'quiz' | 'exam' | 'practice'
    duration_minutes?: number
    total_points: number
    passing_score: number
    is_published: boolean
    max_attempts?: number
    course?: { title: string }
    subject?: { name: string }
    questions?: Array<{ id: string }>
    attempts?: Array<{ 
      id: string
      score?: number
      status: string
    }>
  }
  onView: () => void
  onEdit: () => void
  onTogglePublish: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export default function TestCard({ 
  test, 
  onView, 
  onEdit, 
  onTogglePublish, 
  onDuplicate, 
  onDelete 
}: TestCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'quiz': return 'blue'
      case 'exam': return 'purple'
      case 'practice': return 'green'
      default: return 'gold'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'quiz': return 'Quiz'
      case 'exam': return 'Prova'
      case 'practice': return 'Prática'
      default: return type
    }
  }

  const calculateAverageScore = (attempts: typeof test.attempts) => {
    if (!attempts || attempts.length === 0) return 0
    const completedAttempts = attempts.filter(a => a.status === 'completed' && a.score)
    if (completedAttempts.length === 0) return 0
    const sum = completedAttempts.reduce((acc, a) => acc + (a.score || 0), 0)
    return Math.round(sum / completedAttempts.length)
  }

  const averageScore = calculateAverageScore(test.attempts)
  const attemptCount = test.attempts?.length || 0
  const questionCount = test.questions?.length || 0

  return (
    <Card 
      variant="elevated"
      hoverable
      className="group relative overflow-hidden"
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4 z-10">
        <Badge 
          variant={test.is_published ? 'success' : 'warning'}
          size="sm"
          animate={!test.is_published}
        >
          {test.is_published ? 'Publicado' : 'Rascunho'}
        </Badge>
      </div>

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gold pr-20 line-clamp-1 group-hover:text-gold-300 transition-colors">
          {test.title}
        </h3>
        {test.description && (
          <p className="text-sm text-gold-400 mt-1 line-clamp-2">
            {test.description}
          </p>
        )}
      </div>

      {/* Course & Subject */}
      {(test.course || test.subject) && (
        <div className="mb-4 space-y-1">
          {test.course && (
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gold-500" />
              <span className="text-sm text-gold-300">{test.course.title}</span>
            </div>
          )}
          {test.subject && (
            <div className="flex items-center gap-2 ml-6">
              <span className="text-xs text-gold-400">{test.subject.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-navy-900/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <FileQuestion className="w-4 h-4 text-gold-500" />
            <span className="text-xs text-gold-400">Questões</span>
          </div>
          <p className="text-xl font-bold text-gold">{questionCount}</p>
        </div>

        <div className="bg-navy-900/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gold-500" />
            <span className="text-xs text-gold-400">Tentativas</span>
          </div>
          <p className="text-xl font-bold text-gold">{attemptCount}</p>
        </div>

        <div className="bg-navy-900/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gold-500" />
            <span className="text-xs text-gold-400">Duração</span>
          </div>
          <p className="text-sm font-medium text-gold">
            {test.duration_minutes ? `${test.duration_minutes} min` : 'Livre'}
          </p>
        </div>

        <div className="bg-navy-900/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-gold-500" />
            <span className="text-xs text-gold-400">Média</span>
          </div>
          <p className={`text-sm font-medium ${
            averageScore >= 70 ? 'text-green-400' :
            averageScore >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {attemptCount > 0 ? `${averageScore}%` : '-'}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="info" size="sm">
          {getTypeLabel(test.test_type)}
        </Badge>
        <Badge variant="default" size="sm">
          {test.total_points} pontos
        </Badge>
        <Badge variant="default" size="sm">
          Aprovação: {test.passing_score}%
        </Badge>
        {test.max_attempts && (
          <Badge variant="warning" size="sm">
            Máx: {test.max_attempts} tentativas
          </Badge>
        )}
      </div>

      {/* Progress Bar */}
      {attemptCount > 0 && (
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
          onClick={onView}
          icon={<Eye className="w-4 h-4" />}
        >
          Visualizar
        </Button>

        <div className="flex items-center gap-1">
          <Tooltip content="Editar">
            <button
              onClick={onEdit}
              className="p-2 text-gold-400 hover:text-gold-200 hover:bg-gold-500/10 rounded-lg transition-all"
            >
              <Edit className="w-4 h-4" />
            </button>
          </Tooltip>

          <Tooltip content={test.is_published ? 'Despublicar' : 'Publicar'}>
            <button
              onClick={onTogglePublish}
              className="p-2 text-gold-400 hover:text-gold-200 hover:bg-gold-500/10 rounded-lg transition-all"
            >
              {test.is_published ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
            </button>
          </Tooltip>

          <Tooltip content="Duplicar">
            <button
              onClick={onDuplicate}
              className="p-2 text-gold-400 hover:text-gold-200 hover:bg-gold-500/10 rounded-lg transition-all"
            >
              <Copy className="w-4 h-4" />
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