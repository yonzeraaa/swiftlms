'use client'

import { useState, useEffect, useCallback, ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ExcelExporter } from '@/lib/excel-export'
import Card from './Card'
import Button from './Button'
import { Download, TrendingUp, BookOpen, Target, ChevronDown, ChevronUp, FileText, Scale } from 'lucide-react'

interface StudentGradesReportProps {
  userId: string
  userName?: string
  showHeader?: boolean
  allowExport?: boolean
  dateRange?: {
    start: string
    end: string
  }
  allowEditing?: boolean
}

interface GradeBySubject {
  subjectId: string
  subjectName: string
  courseName: string
  totalTests: number
  testsCompleted: number
  testsMissed: number
  average: number
  highestScore: number
  lowestScore: number
  tests: Array<{
    id: string
    title: string
    score: number
    completed: boolean
    date?: string
  }>
}

export default function StudentGradesReport({
  userId,
  userName,
  showHeader = true,
  allowExport = true,
  dateRange,
  allowEditing = false
}: StudentGradesReportProps) {
  const [loading, setLoading] = useState(true)
  const [gradesBySubject, setGradesBySubject] = useState<GradeBySubject[]>([])
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [totalTestsCount, setTotalTestsCount] = useState(0)
  const [completedTestsCount, setCompletedTestsCount] = useState(0)
  const [testsAverageRaw, setTestsAverageRaw] = useState(0)
  const [tccGradeRaw, setTccGradeRaw] = useState<number | null>(null)
  const [overrides, setOverrides] = useState<{
    id?: string
    tests_average_override?: number | null
    tests_weight?: number | null
    tcc_grade_override?: number | null
    tcc_weight?: number | null
  } | null>(null)
  const [overrideForm, setOverrideForm] = useState({
    testsAverage: '',
    testsWeight: '1',
    tccGrade: '',
    tccWeight: '1'
  })
  const [isSavingOverrides, setIsSavingOverrides] = useState(false)
  const [overrideMessage, setOverrideMessage] = useState<string | null>(null)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  
  const supabase = createClient()

  const fetchStudentGrades = useCallback(async (options?: { skipLoading?: boolean }) => {
    try {
      if (!options?.skipLoading) {
        setLoading(true)
      }
      
      // Buscar informações do aluno se não foi fornecido o nome
      let studentName = userName
      if (!studentName) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId as any)
          .single()
        
        studentName = profile?.full_name || profile?.email || 'Aluno'
      }
      
      // Buscar todos os testes ativos
      const { data: allTests } = await supabase
        .from('tests')
        .select('*, subjects(name), courses(title)')
        .eq('is_active', true)
      
      // Buscar TODAS as tentativas do aluno (sem filtro de data)
      const { data: attempts } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('user_id', userId)
      
      // Criar mapa de tentativas por teste
      const attemptsByTest = new Map<string, any>()
      attempts?.forEach((attempt: any) => {
        if (!attempt.test_id) return
        const existing = attemptsByTest.get(attempt.test_id)
        if (!existing || (attempt.score || 0) > (existing.score || 0)) {
          attemptsByTest.set(attempt.test_id, attempt)
        }
      })
      
      // Agrupar testes por disciplina
      const subjectsMap = new Map<string, GradeBySubject>()
      
      // Contar testes sem subject_id
      const testsWithoutSubject = allTests?.filter((t: any) => !t.subject_id) || []
      if (testsWithoutSubject.length > 0) {
        console.warn(`⚠️ ${testsWithoutSubject.length} testes sem subject_id:`, testsWithoutSubject)
      }
      
      allTests?.forEach((test: any) => {
        // Se não tem subject_id, criar uma categoria "Sem Disciplina"
        const subjectKey = test.subject_id || 'no-subject'
        const attempt = attemptsByTest.get(test.id)
        const score = attempt ? (Number(attempt.score) || 0) : 0
        const completed = !!attempt
        
        if (!subjectsMap.has(subjectKey)) {
          const subjectName = test.subject_id 
            ? (test.subjects?.name || 'Disciplina não encontrada') 
            : 'Sem Disciplina Definida'
          
          subjectsMap.set(subjectKey, {
            subjectId: subjectKey,
            subjectName: subjectName,
            courseName: test.courses?.title || 'Sem curso',
            totalTests: 0,
            testsCompleted: 0,
            testsMissed: 0,
            average: 0,
            highestScore: 0,
            lowestScore: 100,
            tests: []
          })
        }
        
        const subject = subjectsMap.get(subjectKey)!
        subject.totalTests++
        
        if (completed) {
          subject.testsCompleted++
          if (score > subject.highestScore) subject.highestScore = score
          if (score < subject.lowestScore) subject.lowestScore = score
        } else {
          subject.testsMissed++
          subject.lowestScore = 0
        }
        
        subject.tests.push({
          id: test.id,
          title: test.title,
          score,
          completed,
          date: attempt?.submitted_at ? 
            new Date(attempt.submitted_at).toLocaleDateString('pt-BR') : 
            undefined
        })
      })
      
      // Calcular médias
      const subjectsArray = Array.from(subjectsMap.values())
      subjectsArray.forEach(subject => {
        const totalScore = subject.tests.reduce((sum, test) => sum + test.score, 0)
        subject.average = subject.totalTests > 0 ? totalScore / subject.totalTests : 0
      })
      
      // Calcular estatísticas gerais
      const totalTests = subjectsArray.reduce((sum, s) => sum + s.totalTests, 0)
      const completedTests = subjectsArray.reduce((sum, s) => sum + s.testsCompleted, 0)
      const scoreSum = subjectsArray.reduce((sum, s) => {
        return sum + s.tests.reduce((acc, test) => acc + test.score, 0)
      }, 0)
      const rawTestsAverage = totalTests > 0 ? scoreSum / totalTests : 0

      setTotalTestsCount(totalTests)
      setCompletedTestsCount(completedTests)
      setGradesBySubject(subjectsArray)
      setTestsAverageRaw(rawTestsAverage)

      // Buscar nota do TCC mais recente
      const { data: tccSubmission } = await supabase
        .from('tcc_submissions')
        .select('grade')
        .eq('user_id', userId as any)
        .order('evaluated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setTccGradeRaw(tccSubmission?.grade != null ? Number(tccSubmission.grade) : null)

      // Buscar overrides existentes
      const { data: overrideData } = await supabase
        .from('student_grade_overrides')
        .select('*')
        .eq('user_id', userId as any)
        .maybeSingle()

      if (overrideData) {
        setOverrides(overrideData)
        setOverrideForm({
          testsAverage: overrideData.tests_average_override != null ? String(Number(overrideData.tests_average_override)) : '',
          testsWeight: String(Number(overrideData.tests_weight ?? 1)),
          tccGrade: overrideData.tcc_grade_override != null ? String(Number(overrideData.tcc_grade_override)) : '',
          tccWeight: String(Number(overrideData.tcc_weight ?? 1))
        })
      } else {
        setOverrides(null)
        setOverrideForm({
          testsAverage: '',
          testsWeight: '1',
          tccGrade: '',
          tccWeight: '1'
        })
      }

    } catch (error) {
      console.error('Erro ao buscar notas:', error)
    } finally {
      if (!options?.skipLoading) {
        setLoading(false)
      }
    }
  }, [supabase, userId, userName, dateRange])

  useEffect(() => {
    if (userId) {
      fetchStudentGrades()
    }
  }, [userId, fetchStudentGrades])

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects)
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId)
    } else {
      newExpanded.add(subjectId)
    }
    setExpandedSubjects(newExpanded)
  }

  const parseMaybeNumber = (value: string) => {
    if (value === undefined || value === null) return undefined
    const trimmed = value.trim()
    if (trimmed === '') return undefined
    const normalized = trimmed.replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const computeGradeMetrics = () => {
    const savedTestsAverage = overrides?.tests_average_override != null ? Number(overrides.tests_average_override) : undefined
    const savedTestsWeight = overrides?.tests_weight != null ? Number(overrides.tests_weight) : undefined
    const savedTccGrade = overrides?.tcc_grade_override != null ? Number(overrides.tcc_grade_override) : undefined
    const savedTccWeight = overrides?.tcc_weight != null ? Number(overrides.tcc_weight) : undefined

    const formTestsAverage = allowEditing ? parseMaybeNumber(overrideForm.testsAverage) : undefined
    const formTestsWeight = allowEditing ? parseMaybeNumber(overrideForm.testsWeight) : undefined
    const formTccGrade = allowEditing ? parseMaybeNumber(overrideForm.tccGrade) : undefined
    const formTccWeight = allowEditing ? parseMaybeNumber(overrideForm.tccWeight) : undefined

    const testsAverageOverride = formTestsAverage !== undefined ? formTestsAverage : savedTestsAverage
    const testsWeight = formTestsWeight !== undefined
      ? Math.max(formTestsWeight, 0)
      : Math.max(savedTestsWeight ?? 1, 0)

    const tccGradeOverride = formTccGrade !== undefined ? formTccGrade : savedTccGrade
    const tccWeight = formTccWeight !== undefined
      ? Math.max(formTccWeight, 0)
      : Math.max(savedTccWeight ?? 1, 0)

    const testsAverageEffective = testsAverageOverride ?? testsAverageRaw
    const tccGradeBase = tccGradeOverride ?? (tccGradeRaw != null ? Number(tccGradeRaw) : 0)

    const denominator = testsWeight + tccWeight
    const finalAverage = denominator > 0
      ? (testsAverageEffective * testsWeight + tccGradeBase * tccWeight) / denominator
      : 0

    return {
      testsAverageEffective,
      testsAverageRaw,
      testsWeight,
      tccGradeEffective: tccGradeBase,
      tccGradeRaw: tccGradeRaw != null ? Number(tccGradeRaw) : null,
      tccWeight,
      finalAverage,
      testsAverageOverride,
      tccGradeOverride,
      denominator
    }
  }

  const gradeMetrics = computeGradeMetrics()

  const handleOverrideChange = (field: keyof typeof overrideForm) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setOverrideForm(prev => ({ ...prev, [field]: value }))
    setOverrideMessage(null)
    setOverrideError(null)
  }

  const saveOverrides = async () => {
    setIsSavingOverrides(true)
    setOverrideMessage(null)
    setOverrideError(null)

    try {
      const testsAverageValue = parseMaybeNumber(overrideForm.testsAverage)
      const testsWeightValue = Math.max(parseMaybeNumber(overrideForm.testsWeight) ?? 1, 0)
      const tccGradeValue = parseMaybeNumber(overrideForm.tccGrade)
      const tccWeightValue = Math.max(parseMaybeNumber(overrideForm.tccWeight) ?? 1, 0)

      const payload = {
        user_id: userId,
        tests_average_override: testsAverageValue ?? null,
        tests_weight: testsWeightValue,
        tcc_grade_override: tccGradeValue ?? null,
        tcc_weight: tccWeightValue
      }

      const { error } = await supabase
        .from('student_grade_overrides')
        .upsert(payload, { onConflict: 'user_id' })

      if (error) throw error

      setOverrideMessage('Ajustes salvos com sucesso.')
      await fetchStudentGrades({ skipLoading: true })
    } catch (error: any) {
      console.error('Erro ao salvar ajustes de nota:', error)
      setOverrideError(error?.message || 'Não foi possível salvar os ajustes.')
    } finally {
      setIsSavingOverrides(false)
    }
  }

  const resetOverrides = async () => {
    setIsSavingOverrides(true)
    setOverrideMessage(null)
    setOverrideError(null)

    try {
      const { error } = await supabase
        .from('student_grade_overrides')
        .delete()
        .eq('user_id', userId as any)

      if (error) throw error

      setOverrides(null)
      setOverrideForm({
        testsAverage: '',
        testsWeight: '1',
        tccGrade: '',
        tccWeight: '1'
      })
      setOverrideMessage('Ajustes removidos. Valores calculados serão utilizados.')
      await fetchStudentGrades({ skipLoading: true })
    } catch (error: any) {
      console.error('Erro ao remover ajustes de nota:', error)
      setOverrideError(error?.message || 'Não foi possível remover os ajustes.')
    } finally {
      setIsSavingOverrides(false)
    }
  }

  const exportToExcel = async () => {
    const metrics = computeGradeMetrics()
    const exporter = new ExcelExporter()
    
    // Preparar dados para exportação
    const summaryData = gradesBySubject.map(subject => ({
      'Disciplina': subject.subjectName,
      'Curso': subject.courseName,
      'Total de Testes': subject.totalTests,
      'Testes Realizados': subject.testsCompleted,
      'Testes Não Realizados': subject.testsMissed,
      'Média': Number(subject.average.toFixed(1)),
      'Maior Nota': subject.highestScore,
      'Menor Nota': subject.lowestScore
    }))
    
    const detailsData: any[] = []
    gradesBySubject.forEach(subject => {
      subject.tests.forEach(test => {
        detailsData.push({
          'Disciplina': subject.subjectName,
          'Teste': test.title,
          'Nota': test.score,
          'Status': test.completed ? 'Realizado' : 'Não Realizado',
          'Data': test.date || '-'
        })
      })
    })
    
    // Adicionar aba de resumo
    exporter.addDataSheet('Resumo por Disciplina', {
      title: `Histórico de Notas - ${userName || 'Aluno'}`,
      headers: Object.keys(summaryData[0] || {}),
      data: summaryData.map(row => Object.values(row)),
      metadata: {
        date: new Date().toLocaleDateString('pt-BR'),
        user: userName || 'Aluno'
      },
      formatting: {
        conditionalFormatting: [
          {
            condition: (value) => typeof value === 'number' && value < 70,
            font: { bold: true, color: '#FF0000' }
          }
        ],
        columns: {
          5: { // Coluna de Média
            condition: (value) => typeof value === 'number' && value < 70,
            font: { bold: true, color: '#FF0000' }
          }
        }
      }
    })
    
    // Adicionar aba de detalhes
    exporter.addDataSheet('Detalhamento', {
      title: 'Detalhamento de Testes',
      headers: Object.keys(detailsData[0] || {}),
      data: detailsData.map(row => Object.values(row)),
      formatting: {
        conditionalFormatting: [
          {
            condition: (value) => typeof value === 'number' && value < 70,
            font: { bold: true, color: '#FF0000' }
          },
          {
            condition: (value) => value === 'Não Realizado',
            font: { color: '#808080' }
          }
        ]
      }
    })
    
    // Adicionar estatísticas
    exporter.addSummarySheet('Estatísticas', {
      title: 'Estatísticas Gerais',
      sections: [
        {
          sectionTitle: 'Resumo',
          metrics: [
            { label: 'Média Final', value: metrics.finalAverage.toFixed(2) },
            { label: 'Total de Testes', value: totalTestsCount },
            { label: 'Testes Realizados', value: completedTestsCount },
            { label: 'Testes Não Realizados', value: totalTestsCount - completedTestsCount },
            { label: 'Taxa de Participação', value: totalTestsCount > 0 ? `${((completedTestsCount / totalTestsCount) * 100).toFixed(1)}%` : '0.0%' }
          ]
        },
        {
          sectionTitle: 'Médias Ponderadas',
          metrics: [
            { label: 'Média dos Testes', value: metrics.testsAverageEffective.toFixed(2) },
            { label: 'Peso dos Testes', value: metrics.testsWeight.toFixed(2) },
            { label: 'Nota do TCC', value: metrics.tccGradeEffective.toFixed(2) },
            { label: 'Peso do TCC', value: metrics.tccWeight.toFixed(2) }
          ]
        }
      ]
    })
    
    const fileName = `notas_${userName?.replace(/\s+/g, '_').toLowerCase() || 'aluno'}_${new Date().toISOString().split('T')[0]}.xlsx`
    exporter.download(fileName)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-navy-800/50 rounded-xl animate-pulse" />
        <div className="h-24 bg-navy-800/50 rounded-xl animate-pulse" />
        <div className="h-24 bg-navy-800/50 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Histórico de Notas
            </h2>
            {userName && (
              <p className="text-gold-300 mt-1">Aluno: {userName}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Botão de Exportar - sempre visível se allowExport for true */}
      {allowExport && !showHeader && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={exportToExcel}
          >
            Exportar Excel
          </Button>
        </div>
      )}
      
      {/* Se showHeader e allowExport, mostrar botão junto com header */}
      {showHeader && allowExport && (
        <div className="flex justify-end -mt-12">
          <Button
            variant="primary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={exportToExcel}
          >
            Exportar Excel
          </Button>
        </div>
      )}
      
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-navy-800/50 to-navy-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-400 text-sm">Média Final</p>
              <p className={`text-3xl font-bold ${gradeMetrics.finalAverage >= 70 ? 'text-gold' : 'text-red-500'}`}>
                {gradeMetrics.finalAverage.toFixed(2)}
              </p>
              <p className="text-xs text-gold-400 mt-1">
                Pesos: Testes {gradeMetrics.testsWeight.toFixed(2)} · TCC {gradeMetrics.tccWeight.toFixed(2)}
              </p>
            </div>
            <TrendingUp className={`w-8 h-8 ${gradeMetrics.finalAverage >= 70 ? 'text-gold-500' : 'text-red-500'}`} />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-navy-800/50 to-navy-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-400 text-sm">Média dos Testes</p>
              <p className="text-3xl font-bold text-gold">
                {gradeMetrics.testsAverageEffective.toFixed(2)}
              </p>
              {gradeMetrics.testsAverageOverride !== undefined && (
                <p className="text-xs text-gold-400 mt-1">
                  (Calculada: {gradeMetrics.testsAverageRaw.toFixed(2)})
                </p>
              )}
            </div>
            <BookOpen className="w-8 h-8 text-gold-500" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-navy-800/50 to-navy-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-400 text-sm">Nota do TCC</p>
              <p className="text-3xl font-bold text-gold">
                {gradeMetrics.tccGradeEffective.toFixed(2)}
              </p>
              {gradeMetrics.tccGradeOverride === undefined && gradeMetrics.tccGradeRaw !== null && (
                <p className="text-xs text-gold-400 mt-1">Origem: {gradeMetrics.tccGradeRaw.toFixed(2)}</p>
              )}
              {gradeMetrics.tccGradeRaw === null && (
                <p className="text-xs text-gold-400 mt-1">Sem nota de TCC registrada</p>
              )}
            </div>
            <Scale className="w-8 h-8 text-gold-500" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-navy-800/50 to-navy-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gold-400 text-sm">Participação nos Testes</p>
              <p className="text-3xl font-bold text-gold">
                {totalTestsCount > 0 ? Math.round((completedTestsCount / totalTestsCount) * 100) : 0}%
              </p>
              <p className="text-xs text-gold-400 mt-1">
                {completedTestsCount}/{totalTestsCount} realizados
              </p>
            </div>
            <Target className="w-8 h-8 text-gold-500" />
          </div>
        </Card>
      </div>

      {allowEditing && (
        <Card className="bg-gradient-to-br from-navy-800/40 to-navy-900/40 border border-gold-500/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gold flex items-center gap-2">
                <Scale className="w-5 h-5" /> Ajustes de Médias e Pesos
              </h3>
              <p className="text-sm text-gold-300">
                Ajuste manualmente as médias para correções e defina os pesos utilizados na média final.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase text-gold-400">Pré-visualização média final</p>
              <p className={`text-2xl font-bold ${gradeMetrics.finalAverage >= 70 ? 'text-gold' : 'text-red-400'}`}>
                {gradeMetrics.finalAverage.toFixed(2)}
              </p>
            </div>
          </div>

          {overrideMessage && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
              {overrideMessage}
            </div>
          )}

          {overrideError && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {overrideError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gold-300 mb-1">Média dos Testes (ajuste opcional)</label>
                <input
                  type="text"
                  value={overrideForm.testsAverage}
                  onChange={handleOverrideChange('testsAverage')}
                  placeholder={gradeMetrics.testsAverageRaw.toFixed(2)}
                  className="w-full px-3 py-2 bg-navy-900/60 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <p className="text-xs text-gold-400 mt-1">
                  Deixe em branco para usar a média calculada automaticamente ({gradeMetrics.testsAverageRaw.toFixed(2)}).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gold-300 mb-1">Peso dos Testes</label>
                <input
                  type="text"
                  value={overrideForm.testsWeight}
                  onChange={handleOverrideChange('testsWeight')}
                  className="w-full px-3 py-2 bg-navy-900/60 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <p className="text-xs text-gold-400 mt-1">
                  Valores maiores aumentam a influência dos testes na média final. Utilize 0 para desconsiderar.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gold-300 mb-1">Nota do TCC (ajuste opcional)</label>
                <input
                  type="text"
                  value={overrideForm.tccGrade}
                  onChange={handleOverrideChange('tccGrade')}
                  placeholder={gradeMetrics.tccGradeRaw !== null ? gradeMetrics.tccGradeRaw.toFixed(2) : 'Sem nota registrada'}
                  className="w-full px-3 py-2 bg-navy-900/60 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <p className="text-xs text-gold-400 mt-1">
                  Deixe em branco para usar a nota registrada na avaliação de TCC.{gradeMetrics.tccGradeRaw === null ? ' (Nenhuma nota cadastrada até o momento)' : ''}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gold-300 mb-1">Peso do TCC</label>
                <input
                  type="text"
                  value={overrideForm.tccWeight}
                  onChange={handleOverrideChange('tccWeight')}
                  className="w-full px-3 py-2 bg-navy-900/60 border border-gold-500/30 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <p className="text-xs text-gold-400 mt-1">
                  Ajuste o peso para determinar a importância do TCC na média final. Utilize 0 para desconsiderar.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={resetOverrides}
              disabled={isSavingOverrides}
            >
              Restaurar valores calculados
            </Button>
            <Button
              variant="primary"
              onClick={saveOverrides}
              disabled={isSavingOverrides}
            >
              {isSavingOverrides ? 'Salvando...' : 'Salvar ajustes'}
            </Button>
          </div>
        </Card>
      )}

      {/* Lista de Disciplinas */}
      <div className="space-y-4">
        {gradesBySubject.map(subject => (
          <Card key={subject.subjectId} className="overflow-hidden">
            <div 
              className="p-6 cursor-pointer hover:bg-navy-800/30 transition-colors"
              onClick={() => toggleSubject(subject.subjectId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gold">{subject.subjectName}</h3>
                  <p className="text-sm text-gold-400 mt-1">{subject.courseName}</p>
                  
                  <div className="flex items-center gap-6 mt-3">
                    <div>
                      <span className="text-gold-500 text-sm">Média: </span>
                      <span className={`font-bold text-lg ${subject.average >= 70 ? 'text-gold' : 'text-red-500'}`}>
                        {subject.average.toFixed(1)}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-gold-500 text-sm">Progresso: </span>
                      <span className="text-gold-200">
                        {subject.testsCompleted}/{subject.totalTests} testes
                      </span>
                    </div>
                  </div>
                  
                  {/* Barra de Progresso */}
                  <div className="mt-3 bg-navy-900/50 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-gold-500 to-gold-600 transition-all duration-500"
                      style={{ width: `${subject.totalTests > 0 ? (subject.testsCompleted / subject.totalTests) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                
                <div className="ml-4">
                  {expandedSubjects.has(subject.subjectId) ? (
                    <ChevronUp className="w-5 h-5 text-gold-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gold-400" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Detalhes Expandidos */}
            {expandedSubjects.has(subject.subjectId) && (
              <div className="border-t border-gold-500/20 p-6 bg-navy-900/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-gold-500 text-sm">Maior Nota</p>
                    <p className="text-2xl font-bold text-green-500">{subject.highestScore}</p>
                  </div>
                  <div>
                    <p className="text-gold-500 text-sm">Menor Nota</p>
                    <p className={`text-2xl font-bold ${subject.lowestScore >= 70 ? 'text-gold' : 'text-red-500'}`}>
                      {subject.lowestScore}
                    </p>
                  </div>
                  <div>
                    <p className="text-gold-500 text-sm">Não Realizados</p>
                    <p className="text-2xl font-bold text-orange-500">{subject.testsMissed}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-gold-400 font-medium mb-2">Detalhamento dos Testes:</p>
                  {subject.tests.map(test => (
                    <div 
                      key={test.id}
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        test.completed ? 'bg-navy-800/50' : 'bg-navy-900/50'
                      }`}
                    >
                      <div className="flex-1">
                        <p className={`font-medium ${test.completed ? 'text-gold-200' : 'text-gold-600'}`}>
                          {test.title}
                        </p>
                        {test.date && (
                          <p className="text-xs text-gold-500 mt-1">Data: {test.date}</p>
                        )}
                      </div>
                      <div className="ml-4">
                        {test.completed ? (
                          <span className={`font-bold text-lg ${test.score >= 70 ? 'text-gold' : 'text-red-500'}`}>
                            {test.score}
                          </span>
                        ) : (
                          <span className="text-gold-600 text-sm">Não Realizado</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      
      {gradesBySubject.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gold-400">Nenhum teste encontrado para este aluno.</p>
        </Card>
      )}
    </div>
  )
}
