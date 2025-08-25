'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Download, Calendar, TrendingUp, FileText, Filter, FileSpreadsheet, Users, BookOpen, Award, GraduationCap, Activity, Table } from 'lucide-react'
import Card from '../../components/Card'
import Button from '../../components/Button'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useTranslation } from '../../contexts/LanguageContext'
import { ExcelExporter, exportReportToExcel, PivotTableConfig } from '@/lib/excel-export'

type Profile = Database['public']['Tables']['profiles']['Row']
type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']

interface ReportData {
  totalStudents: number
  totalInstructors: number
  totalCourses: number
  totalEnrollments: number
  completedCourses: number
  averageCompletionRate: number
  activeStudents: number
  coursesPerCategory: { category: string; count: number }[]
  enrollmentsByMonth: { month: string; count: number }[]
  topCourses: { title: string; enrollments: number }[]
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const supabase = createClient()

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchReportData = async () => {
    try {
      setLoading(true)

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')

      const students = profiles?.filter(p => p.role === 'student') || []
      const instructors = profiles?.filter(p => p.role === 'instructor') || []
      const activeStudents = students.filter(s => s.status === 'active').length

      // Fetch courses
      const { data: courses } = await supabase
        .from('courses')
        .select('*')

      // Fetch enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*')
        .gte('enrolled_at', dateRange.start)
        .lte('enrolled_at', dateRange.end)
        .in('status', ['active', 'completed'])

      const completedCourses = enrollments?.filter(e => e.status === 'completed').length || 0
      const totalEnrollments = enrollments?.length || 0
      const averageCompletionRate = totalEnrollments > 0 
        ? Math.round((completedCourses / totalEnrollments) * 100)
        : 0

      // Courses per category
      const categoryMap = new Map<string, number>()
      courses?.forEach(course => {
        const count = categoryMap.get(course.category) || 0
        categoryMap.set(course.category, count + 1)
      })
      const coursesPerCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count
      }))

      // Enrollments by month
      const monthMap = new Map<string, number>()
      enrollments?.forEach(enrollment => {
        if (enrollment.enrolled_at) {
          const date = new Date(enrollment.enrolled_at)
          const month = date.toLocaleDateString('pt-BR', { 
            month: 'short', 
            year: 'numeric' 
          })
          const count = monthMap.get(month) || 0
          monthMap.set(month, count + 1)
        }
      })
      const enrollmentsByMonth = Array.from(monthMap.entries()).map(([month, count]) => ({
        month,
        count
      }))

      // Top courses
      const courseEnrollmentMap = new Map<string, { title: string; count: number }>()
      enrollments?.forEach(enrollment => {
        const course = courses?.find(c => c.id === enrollment.course_id)
        if (course) {
          const existing = courseEnrollmentMap.get(course.id) || { title: course.title, count: 0 }
          courseEnrollmentMap.set(course.id, { 
            title: course.title, 
            count: existing.count + 1 
          })
        }
      })
      const topCourses = Array.from(courseEnrollmentMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(({ title, count }) => ({ title, enrollments: count }))

      setReportData({
        totalStudents: students.length,
        totalInstructors: instructors.length,
        totalCourses: courses?.length || 0,
        totalEnrollments,
        completedCourses,
        averageCompletionRate,
        activeStudents,
        coursesPerCategory,
        enrollmentsByMonth,
        topCourses
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async (reportType: string) => {
    setGeneratingReport(reportType)
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Handle different report types
    if (reportType === 'grades') {
      generateGradesHistoryReport()
    } else if (reportType === 'enrollments') {
      generateEnrollmentAndCompletionReport()
    } else if (reportType === 'access') {
      generateAccessReport()
    } else {
      // In a real application, you would generate actual PDF/Excel files here
      alert(t('reports.reportGenerated'))
    }
    
    setGeneratingReport(null)
  }

  const generateGradesHistoryReport = () => {
    // Dados simulados para o relatório
    const gradesData = [
      {
        student: 'João Silva',
        email: 'joao.silva@email.com',
        course: 'Fundamentos de Engenharia Naval',
        subject: 'Engenharia Naval Básica',
        test: 'Avaliação de Hidrostática',
        type: 'Quiz',
        date: '2024-02-15',
        grade: 85,
        status: 'Aprovado'
      },
      {
        student: 'Maria Santos',
        email: 'maria.santos@email.com',
        course: 'Fundamentos de Engenharia Naval',
        subject: 'Engenharia Naval Básica',
        test: 'Avaliação de Hidrostática',
        type: 'Quiz',
        date: '2024-02-15',
        grade: 92,
        status: 'Aprovado'
      },
      {
        student: 'Pedro Oliveira',
        email: 'pedro.oliveira@email.com',
        course: 'Propulsão Naval',
        subject: 'Sistemas de Propulsão Marítima',
        test: 'Prova Final - Propulsão Naval',
        type: 'Prova',
        date: '2024-02-20',
        grade: 78,
        status: 'Aprovado'
      },
      {
        student: 'Ana Costa',
        email: 'ana.costa@email.com',
        course: 'Normas de Segurança',
        subject: 'Segurança Marítima e SOLAS',
        test: 'Teste de SOLAS - Módulo 1',
        type: 'Quiz',
        date: '2024-02-25',
        grade: 95,
        status: 'Aprovado'
      },
      {
        student: 'Carlos Ferreira',
        email: 'carlos.ferreira@email.com',
        course: 'Fundamentos de Engenharia Naval',
        subject: 'Engenharia Naval Básica',
        test: 'Simulado de Estabilidade',
        type: 'Simulado',
        date: '2024-03-01',
        grade: 68,
        status: 'Aprovado'
      }
    ]

    // Configuração da tabela dinâmica
    const pivotConfig: PivotTableConfig = {
      rows: ['course', 'subject'],
      columns: ['type'],
      values: [
        { field: 'grade', aggregation: 'average' },
        { field: 'grade', aggregation: 'count' }
      ],
      filters: ['status']
    }

    // Dados de resumo
    const summary = {
      title: 'Resumo do Histórico de Notas',
      sections: [
        {
          sectionTitle: 'Estatísticas Gerais',
          metrics: [
            { label: 'Total de Avaliações', value: gradesData.length },
            { label: 'Média Geral', value: '83.6' },
            { label: 'Taxa de Aprovação', value: '100%' },
            { label: 'Maior Nota', value: 95 },
            { label: 'Menor Nota', value: 68 }
          ]
        },
        {
          sectionTitle: 'Por Tipo de Avaliação',
          metrics: [
            { label: 'Quiz', value: '3 avaliações (média: 90.7)' },
            { label: 'Prova', value: '1 avaliação (média: 78.0)' },
            { label: 'Simulado', value: '1 avaliação (média: 68.0)' }
          ]
        }
      ]
    }

    // Exportar para Excel com múltiplas abas
    exportReportToExcel(
      {
        mainData: gradesData,
        headers: ['student', 'email', 'course', 'subject', 'test', 'type', 'date', 'grade', 'status'],
        pivotConfig,
        summary
      },
      `historico_notas_${new Date().toISOString().split('T')[0]}.xlsx`
    )

    alert(t('reports.gradesReportGenerated'))
  }

  const generateGradesHistoryReportCSV = () => {
    // Create CSV content for grades history with UTF-8 BOM for proper encoding
    const BOM = '\uFEFF'
    let csvContent = BOM
    
    // Add headers
    csvContent += 'Aluno,Email,Curso,Disciplina,Teste,Tipo,Data,Nota,Status\n'
    
    // Simulated data
    const gradesData = [
      {
        student: 'João Silva',
        email: 'joao.silva@email.com',
        course: 'Fundamentos de Engenharia Naval',
        subject: 'Engenharia Naval Básica',
        test: 'Avaliação de Hidrostática',
        type: 'Quiz',
        date: '2024-02-15',
        grade: 85,
        status: 'Aprovado'
      },
      {
        student: 'Maria Santos',
        email: 'maria.santos@email.com',
        course: 'Fundamentos de Engenharia Naval',
        subject: 'Engenharia Naval Básica',
        test: 'Avaliação de Hidrostática',
        type: 'Quiz',
        date: '2024-02-15',
        grade: 92,
        status: 'Aprovado'
      },
      {
        student: 'Pedro Oliveira',
        email: 'pedro.oliveira@email.com',
        course: 'Propulsão Naval',
        subject: 'Sistemas de Propulsão Marítima',
        test: 'Prova Final - Propulsão Naval',
        type: 'Prova',
        date: '2024-02-20',
        grade: 78,
        status: 'Aprovado'
      },
      {
        student: 'Ana Costa',
        email: 'ana.costa@email.com',
        course: 'Normas de Segurança',
        subject: 'Segurança Marítima e SOLAS',
        test: 'Teste de SOLAS - Módulo 1',
        type: 'Quiz',
        date: '2024-02-25',
        grade: 95,
        status: 'Aprovado'
      },
      {
        student: 'Carlos Ferreira',
        email: 'carlos.ferreira@email.com',
        course: 'Fundamentos de Engenharia Naval',
        subject: 'Engenharia Naval Básica',
        test: 'Simulado de Estabilidade',
        type: 'Simulado',
        date: '2024-03-01',
        grade: 68,
        status: 'Aprovado'
      }
    ]
    
    // Add data rows
    gradesData.forEach(grade => {
      csvContent += `${grade.student},${grade.email},${grade.course},${grade.subject},${grade.test},${grade.type},${grade.date},${grade.grade},${grade.status}\n`
    })
    
    // Add summary
    csvContent += '\n\nResumo\n'
    csvContent += 'Total de Avaliações,5\n'
    csvContent += 'Média Geral,83.6\n'
    csvContent += 'Taxa de Aprovação,100%\n'
    
    // Create download link with proper UTF-8 encoding
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `historico_notas_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    alert(t('reports.gradesReportGenerated'))
  }

  const generateEnrollmentAndCompletionReport = () => {
    // Dados simulados
    const enrollmentData = [
      { student: 'João Silva', email: 'joao.silva@email.com', course: 'Fundamentos de Engenharia Naval', date: '2024-02-01', status: 'Ativo', progress: 72, lessons_completed: 15, total_lessons: 20 },
      { student: 'Maria Santos', email: 'maria.santos@email.com', course: 'Propulsão Naval', date: '2024-02-05', status: 'Ativo', progress: 85, lessons_completed: 17, total_lessons: 20 },
      { student: 'Pedro Oliveira', email: 'pedro.oliveira@email.com', course: 'Normas de Segurança', date: '2024-02-10', status: 'Ativo', progress: 60, lessons_completed: 12, total_lessons: 20 },
      { student: 'Ana Costa', email: 'ana.costa@email.com', course: 'Fundamentos de Engenharia Naval', date: '2024-02-15', status: 'Ativo', progress: 92, lessons_completed: 18, total_lessons: 20 },
      { student: 'Carlos Ferreira', email: 'carlos.ferreira@email.com', course: 'Propulsão Naval', date: '2024-02-20', status: 'Ativo', progress: 45, lessons_completed: 9, total_lessons: 20 }
    ]

    const completionData = [
      { student: 'Lucas Mendes', email: 'lucas.mendes@email.com', course: 'Fundamentos de Engenharia Naval', enrollment_date: '2024-01-15', completion_date: '2024-02-28', final_grade: 87, certificate: 'SIM', total_hours: 40 },
      { student: 'Juliana Rocha', email: 'juliana.rocha@email.com', course: 'Normas de Segurança', enrollment_date: '2024-01-20', completion_date: '2024-03-01', final_grade: 92, certificate: 'SIM', total_hours: 35 },
      { student: 'Roberto Lima', email: 'roberto.lima@email.com', course: 'Propulsão Naval', enrollment_date: '2024-01-25', completion_date: '2024-03-05', final_grade: 78, certificate: 'SIM', total_hours: 45 }
    ]

    // Criar exportador Excel
    const exporter = new ExcelExporter()

    // Aba de matrículas
    exporter.addDataSheet('Matrículas', {
      title: 'Relatório de Matrículas',
      headers: ['Aluno', 'Email', 'Curso', 'Data de Matrícula', 'Status', 'Progresso (%)', 'Lições Concluídas', 'Total de Lições'],
      data: enrollmentData.map(e => [
        e.student,
        e.email,
        e.course,
        e.date,
        e.status,
        e.progress,
        e.lessons_completed,
        e.total_lessons
      ]),
      metadata: {
        date: new Date().toLocaleDateString('pt-BR'),
        period: `${new Date(dateRange.start).toLocaleDateString('pt-BR')} - ${new Date(dateRange.end).toLocaleDateString('pt-BR')}`,
        user: 'Sistema SwiftEDU',
        filters: {
          'Status': 'Ativo',
          'Período': 'Último mês'
        }
      }
    })

    // Aba de conclusões
    exporter.addDataSheet('Conclusões', {
      title: 'Relatório de Conclusões',
      headers: ['Aluno', 'Email', 'Curso', 'Data de Matrícula', 'Data de Conclusão', 'Nota Final', 'Certificado', 'Horas Totais'],
      data: completionData.map(c => [
        c.student,
        c.email,
        c.course,
        c.enrollment_date,
        c.completion_date,
        c.final_grade,
        c.certificate,
        c.total_hours
      ]),
      metadata: {
        date: new Date().toLocaleDateString('pt-BR'),
        period: `${new Date(dateRange.start).toLocaleDateString('pt-BR')} - ${new Date(dateRange.end).toLocaleDateString('pt-BR')}`,
        user: 'Sistema SwiftEDU'
      }
    })

    // Tabela dinâmica de matrículas por curso
    const allData = [...enrollmentData.map(e => ({ ...e, type: 'matricula' })), 
                     ...completionData.map(c => ({ ...c, type: 'conclusao', course: c.course, status: 'Concluído' }))]
    
    exporter.addPivotTable('Análise por Curso', allData, {
      rows: ['course'],
      columns: ['status'],
      values: [
        { field: 'student', aggregation: 'count' }
      ]
    })

    // Resumo
    exporter.addSummarySheet('Resumo', {
      title: 'Resumo de Matrículas e Conclusões',
      sections: [
        {
          sectionTitle: 'Estatísticas de Matrículas',
          metrics: [
            { label: 'Total de Matrículas no Período', value: enrollmentData.length },
            { label: 'Progresso Médio', value: `${Math.round(enrollmentData.reduce((acc, e) => acc + e.progress, 0) / enrollmentData.length)}%` },
            { label: 'Matrículas Ativas', value: enrollmentData.filter(e => e.status === 'Ativo').length }
          ]
        },
        {
          sectionTitle: 'Estatísticas de Conclusões',
          metrics: [
            { label: 'Total de Conclusões no Período', value: completionData.length },
            { label: 'Nota Média dos Concluintes', value: (completionData.reduce((acc, c) => acc + c.final_grade, 0) / completionData.length).toFixed(1) },
            { label: 'Taxa de Conclusão', value: `${Math.round((completionData.length / (enrollmentData.length + completionData.length)) * 100)}%` },
            { label: 'Horas Médias de Estudo', value: `${Math.round(completionData.reduce((acc, c) => acc + c.total_hours, 0) / completionData.length)}h` }
          ]
        }
      ]
    })

    exporter.download(`relatorio_matriculas_conclusoes_${new Date().toISOString().split('T')[0]}.xlsx`)
    alert('Relatório de Matrículas e Conclusões gerado com sucesso!')
  }

  const generateEnrollmentAndCompletionReportCSV = () => {
    // Create CSV content for enrollments and completions with UTF-8 BOM
    const BOM = '\uFEFF'
    let csvContent = BOM
    
    // Add headers
    csvContent += 'Relatório de Matrículas e Conclusões\n'
    csvContent += `Período: ${new Date(dateRange.start).toLocaleDateString('pt-BR')} - ${new Date(dateRange.end).toLocaleDateString('pt-BR')}\n\n`
    
    // Enrollments section
    csvContent += 'MATRÍCULAS\n'
    csvContent += 'Aluno,Email,Curso,Data de Matrícula,Status\n'
    
    // Simulated enrollment data
    const enrollmentData = [
      { student: 'João Silva', email: 'joao.silva@email.com', course: 'Fundamentos de Engenharia Naval', date: '2024-02-01', status: 'Ativo' },
      { student: 'Maria Santos', email: 'maria.santos@email.com', course: 'Propulsão Naval', date: '2024-02-05', status: 'Ativo' },
      { student: 'Pedro Oliveira', email: 'pedro.oliveira@email.com', course: 'Normas de Segurança', date: '2024-02-10', status: 'Ativo' },
      { student: 'Ana Costa', email: 'ana.costa@email.com', course: 'Fundamentos de Engenharia Naval', date: '2024-02-15', status: 'Ativo' },
      { student: 'Carlos Ferreira', email: 'carlos.ferreira@email.com', course: 'Propulsão Naval', date: '2024-02-20', status: 'Ativo' }
    ]
    
    enrollmentData.forEach(enrollment => {
      csvContent += `${enrollment.student},${enrollment.email},${enrollment.course},${enrollment.date},${enrollment.status}\n`
    })
    
    // Completions section
    csvContent += '\n\nCONCLUSÕES\n'
    csvContent += 'Aluno,Email,Curso,Data de Conclusão,Nota Final,Certificado\n'
    
    // Simulated completion data
    const completionData = [
      { student: 'Lucas Mendes', email: 'lucas.mendes@email.com', course: 'Fundamentos de Engenharia Naval', completionDate: '2024-02-28', finalGrade: 87, certificate: 'SIM' },
      { student: 'Juliana Rocha', email: 'juliana.rocha@email.com', course: 'Normas de Segurança', completionDate: '2024-03-01', finalGrade: 92, certificate: 'SIM' },
      { student: 'Roberto Lima', email: 'roberto.lima@email.com', course: 'Propulsão Naval', completionDate: '2024-03-05', finalGrade: 78, certificate: 'SIM' }
    ]
    
    completionData.forEach(completion => {
      csvContent += `${completion.student},${completion.email},${completion.course},${completion.completionDate},${completion.finalGrade},${completion.certificate}\n`
    })
    
    // Summary
    csvContent += '\n\nRESUMO\n'
    csvContent += `Total de Matrículas no Período,${enrollmentData.length}\n`
    csvContent += `Total de Conclusões no Período,${completionData.length}\n`
    csvContent += `Taxa de Conclusão,${Math.round((completionData.length / (reportData?.totalEnrollments || 1)) * 100)}%\n`
    csvContent += `Nota Média dos Concluintes,${(completionData.reduce((acc, c) => acc + c.finalGrade, 0) / completionData.length).toFixed(1)}\n`
    
    // Create download link with proper UTF-8 encoding
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_matriculas_conclusoes_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    alert('Relatório de Matrículas e Conclusões gerado com sucesso!')
  }

  const generateAccessReport = () => {
    // Dados simulados
    const studentAccessData = [
      { name: 'João Silva', email: 'joao.silva@email.com', lastAccess: '2024-03-15 14:30', totalAccess: 156, totalHours: 48.5, avgSession: 18.6, coursesAccessed: 3, avgCompletion: 72, device: 'Desktop', browser: 'Chrome' },
      { name: 'Maria Santos', email: 'maria.santos@email.com', lastAccess: '2024-03-15 09:15', totalAccess: 234, totalHours: 67.2, avgSession: 17.2, coursesAccessed: 4, avgCompletion: 85, device: 'Mobile', browser: 'Safari' },
      { name: 'Pedro Oliveira', email: 'pedro.oliveira@email.com', lastAccess: '2024-03-14 20:45', totalAccess: 98, totalHours: 32.1, avgSession: 19.6, coursesAccessed: 2, avgCompletion: 60, device: 'Desktop', browser: 'Firefox' },
      { name: 'Ana Costa', email: 'ana.costa@email.com', lastAccess: '2024-03-15 16:20', totalAccess: 312, totalHours: 89.7, avgSession: 17.2, coursesAccessed: 5, avgCompletion: 92, device: 'Tablet', browser: 'Chrome' },
      { name: 'Carlos Ferreira', email: 'carlos.ferreira@email.com', lastAccess: '2024-03-13 11:00', totalAccess: 87, totalHours: 21.3, avgSession: 14.7, coursesAccessed: 2, avgCompletion: 45, device: 'Mobile', browser: 'Chrome' }
    ]

    const dailyPattern = [
      { day: 'Segunda-feira', accesses: 542, peakUsers: 123, peakTime: '19:00-20:00', avgDuration: 25.3 },
      { day: 'Terça-feira', accesses: 498, peakUsers: 115, peakTime: '20:00-21:00', avgDuration: 23.7 },
      { day: 'Quarta-feira', accesses: 523, peakUsers: 118, peakTime: '19:00-20:00', avgDuration: 24.1 },
      { day: 'Quinta-feira', accesses: 467, peakUsers: 102, peakTime: '21:00-22:00', avgDuration: 22.5 },
      { day: 'Sexta-feira', accesses: 321, peakUsers: 78, peakTime: '18:00-19:00', avgDuration: 19.8 },
      { day: 'Sábado', accesses: 234, peakUsers: 56, peakTime: '10:00-11:00', avgDuration: 28.4 },
      { day: 'Domingo', accesses: 198, peakUsers: 43, peakTime: '20:00-21:00', avgDuration: 30.2 }
    ]

    const courseEngagement = [
      { course: 'Fundamentos de Engenharia Naval', activeStudents: 145, avgTime: 24.3, completionRate: 78, avgRating: 4.5, totalViews: 3456, totalDownloads: 234 },
      { course: 'Propulsão Naval', activeStudents: 98, avgTime: 18.7, completionRate: 65, avgRating: 4.2, totalViews: 2134, totalDownloads: 156 },
      { course: 'Normas de Segurança', activeStudents: 234, avgTime: 15.2, completionRate: 89, avgRating: 4.7, totalViews: 5678, totalDownloads: 456 },
      { course: 'Manutenção Naval', activeStudents: 76, avgTime: 21.5, completionRate: 71, avgRating: 4.3, totalViews: 1567, totalDownloads: 98 }
    ]

    // Criar exportador Excel
    const exporter = new ExcelExporter()

    // Aba de estatísticas por aluno
    exporter.addDataSheet('Estatísticas por Aluno', {
      title: 'Estatísticas de Acesso dos Alunos',
      headers: ['Aluno', 'Email', 'Último Acesso', 'Total de Acessos', 'Tempo Total (horas)', 'Tempo Médio por Sessão (min)', 'Cursos Acessados', 'Conclusão Média (%)', 'Dispositivo', 'Navegador'],
      data: studentAccessData.map(s => [
        s.name,
        s.email,
        s.lastAccess,
        s.totalAccess,
        s.totalHours,
        s.avgSession,
        s.coursesAccessed,
        s.avgCompletion,
        s.device,
        s.browser
      ]),
      metadata: {
        date: new Date().toLocaleDateString('pt-BR'),
        period: `${new Date(dateRange.start).toLocaleDateString('pt-BR')} - ${new Date(dateRange.end).toLocaleDateString('pt-BR')}`,
        user: 'Sistema SwiftEDU'
      }
    })

    // Aba de padrão de acesso diário
    exporter.addDataSheet('Padrão de Acesso Diário', {
      title: 'Análise de Acesso por Dia da Semana',
      headers: ['Dia da Semana', 'Total de Acessos', 'Pico de Usuários', 'Horário de Pico', 'Duração Média (min)'],
      data: dailyPattern.map(d => [
        d.day,
        d.accesses,
        d.peakUsers,
        d.peakTime,
        d.avgDuration
      ]),
      metadata: {
        date: new Date().toLocaleDateString('pt-BR'),
        user: 'Sistema SwiftEDU'
      }
    })

    // Aba de engajamento por curso
    exporter.addDataSheet('Engajamento por Curso', {
      title: 'Métricas de Engajamento dos Cursos',
      headers: ['Curso', 'Alunos Ativos', 'Tempo Médio (horas)', 'Taxa de Conclusão (%)', 'Avaliação Média', 'Visualizações Totais', 'Downloads Totais'],
      data: courseEngagement.map(c => [
        c.course,
        c.activeStudents,
        c.avgTime,
        c.completionRate,
        c.avgRating,
        c.totalViews,
        c.totalDownloads
      ]),
      metadata: {
        date: new Date().toLocaleDateString('pt-BR'),
        user: 'Sistema SwiftEDU'
      }
    })

    // Tabela dinâmica de dispositivos e navegadores
    exporter.addPivotTable('Análise de Dispositivos', studentAccessData, {
      rows: ['device'],
      columns: ['browser'],
      values: [
        { field: 'totalAccess', aggregation: 'sum' },
        { field: 'totalHours', aggregation: 'average' }
      ]
    })

    // Resumo
    exporter.addSummarySheet('Resumo', {
      title: 'Resumo de Estatísticas de Acesso',
      sections: [
        {
          sectionTitle: 'Métricas Gerais',
          metrics: [
            { label: 'Total de Alunos Ativos', value: reportData?.activeStudents || 0 },
            { label: 'Média de Acessos por Aluno', value: Math.round(studentAccessData.reduce((acc, s) => acc + s.totalAccess, 0) / studentAccessData.length) },
            { label: 'Tempo Médio de Estudo por Aluno', value: `${(studentAccessData.reduce((acc, s) => acc + s.totalHours, 0) / studentAccessData.length).toFixed(1)} horas` },
            { label: 'Taxa Média de Conclusão', value: `${Math.round(studentAccessData.reduce((acc, s) => acc + s.avgCompletion, 0) / studentAccessData.length)}%` }
          ]
        },
        {
          sectionTitle: 'Padrões de Acesso',
          metrics: [
            { label: 'Horário de Maior Acesso', value: '19:00-21:00' },
            { label: 'Dia com Mais Acessos', value: 'Segunda-feira' },
            { label: 'Total de Acessos na Semana', value: dailyPattern.reduce((acc, d) => acc + d.accesses, 0) },
            { label: 'Média de Usuários no Pico', value: Math.round(dailyPattern.reduce((acc, d) => acc + d.peakUsers, 0) / dailyPattern.length) }
          ]
        },
        {
          sectionTitle: 'Engajamento dos Cursos',
          metrics: [
            { label: 'Curso Mais Acessado', value: 'Normas de Segurança' },
            { label: 'Maior Taxa de Conclusão', value: 'Normas de Segurança (89%)' },
            { label: 'Melhor Avaliação', value: 'Normas de Segurança (4.7)' },
            { label: 'Total de Visualizações', value: courseEngagement.reduce((acc, c) => acc + c.totalViews, 0) }
          ]
        }
      ]
    })

    exporter.download(`relatorio_acesso_alunos_${new Date().toISOString().split('T')[0]}.xlsx`)
    alert('Relatório de Estatísticas de Acesso dos Alunos gerado com sucesso!')
  }

  const generateAccessReportCSV = () => {
    // Create CSV content for student access statistics with UTF-8 BOM
    const BOM = '\uFEFF'
    let csvContent = BOM
    
    // Add headers
    csvContent += 'Relatório de Estatísticas de Acesso dos Alunos\n'
    csvContent += `Período: ${new Date(dateRange.start).toLocaleDateString('pt-BR')} - ${new Date(dateRange.end).toLocaleDateString('pt-BR')}\n\n`
    
    // Student access section
    csvContent += 'ESTATÍSTICAS POR ALUNO\n'
    csvContent += 'Aluno,Email,Último Acesso,Total de Acessos,Tempo Total (horas),Tempo Médio por Sessão (min),Cursos Acessados,Conclusão Média (%)\n'
    
    const studentAccessData = [
      { name: 'João Silva', email: 'joao.silva@email.com', lastAccess: '2024-03-15 14:30', totalAccess: 156, totalHours: 48.5, avgSession: 18.6, coursesAccessed: 3, avgCompletion: 72 },
      { name: 'Maria Santos', email: 'maria.santos@email.com', lastAccess: '2024-03-15 09:15', totalAccess: 234, totalHours: 67.2, avgSession: 17.2, coursesAccessed: 4, avgCompletion: 85 },
      { name: 'Pedro Oliveira', email: 'pedro.oliveira@email.com', lastAccess: '2024-03-14 20:45', totalAccess: 98, totalHours: 32.1, avgSession: 19.6, coursesAccessed: 2, avgCompletion: 60 },
      { name: 'Ana Costa', email: 'ana.costa@email.com', lastAccess: '2024-03-15 16:20', totalAccess: 312, totalHours: 89.7, avgSession: 17.2, coursesAccessed: 5, avgCompletion: 92 },
      { name: 'Carlos Ferreira', email: 'carlos.ferreira@email.com', lastAccess: '2024-03-13 11:00', totalAccess: 87, totalHours: 21.3, avgSession: 14.7, coursesAccessed: 2, avgCompletion: 45 }
    ]
    
    studentAccessData.forEach(student => {
      csvContent += `${student.name},${student.email},${student.lastAccess},${student.totalAccess},${student.totalHours},${student.avgSession},${student.coursesAccessed},${student.avgCompletion}\n`
    })
    
    // Daily access pattern
    csvContent += '\n\nPADRÃO DE ACESSO DIÁRIO\n'
    csvContent += 'Dia da Semana,Total de Acessos,Pico de Usuários,Horário de Pico\n'
    
    const dailyPattern = [
      { day: 'Segunda-feira', accesses: 542, peakUsers: 123, peakTime: '19:00-20:00' },
      { day: 'Terça-feira', accesses: 498, peakUsers: 115, peakTime: '20:00-21:00' },
      { day: 'Quarta-feira', accesses: 523, peakUsers: 118, peakTime: '19:00-20:00' },
      { day: 'Quinta-feira', accesses: 467, peakUsers: 102, peakTime: '21:00-22:00' },
      { day: 'Sexta-feira', accesses: 321, peakUsers: 78, peakTime: '18:00-19:00' },
      { day: 'Sábado', accesses: 234, peakUsers: 56, peakTime: '10:00-11:00' },
      { day: 'Domingo', accesses: 198, peakUsers: 43, peakTime: '20:00-21:00' }
    ]
    
    dailyPattern.forEach(day => {
      csvContent += `${day.day},${day.accesses},${day.peakUsers},${day.peakTime}\n`
    })
    
    // Course engagement
    csvContent += '\n\nENGAJAMENTO POR CURSO\n'
    csvContent += 'Curso,Alunos Ativos,Tempo Médio (horas),Taxa de Conclusão (%),Avaliação Média\n'
    
    const courseEngagement = [
      { course: 'Fundamentos de Engenharia Naval', activeStudents: 145, avgTime: 24.3, completionRate: 78, avgRating: 4.5 },
      { course: 'Propulsão Naval', activeStudents: 98, avgTime: 18.7, completionRate: 65, avgRating: 4.2 },
      { course: 'Normas de Segurança', activeStudents: 234, avgTime: 15.2, completionRate: 89, avgRating: 4.7 },
      { course: 'Manutenção Naval', activeStudents: 76, avgTime: 21.5, completionRate: 71, avgRating: 4.3 }
    ]
    
    courseEngagement.forEach(course => {
      csvContent += `${course.course},${course.activeStudents},${course.avgTime},${course.completionRate},${course.avgRating}\n`
    })
    
    // Summary statistics
    csvContent += '\n\nRESUMO GERAL\n'
    csvContent += 'Métrica,Valor\n'
    csvContent += `Total de Alunos Ativos,${reportData?.activeStudents || 0}\n`
    csvContent += `Média de Acessos por Aluno,${Math.round(studentAccessData.reduce((acc, s) => acc + s.totalAccess, 0) / studentAccessData.length)}\n`
    csvContent += `Tempo Médio de Estudo por Aluno,${(studentAccessData.reduce((acc, s) => acc + s.totalHours, 0) / studentAccessData.length).toFixed(1)} horas\n`
    csvContent += `Taxa Média de Conclusão,${Math.round(studentAccessData.reduce((acc, s) => acc + s.avgCompletion, 0) / studentAccessData.length)}%\n`
    csvContent += 'Horário de Maior Acesso,19:00-21:00\n'
    csvContent += 'Dia com Mais Acessos,Segunda-feira\n'
    
    // Create download link with proper UTF-8 encoding
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_acesso_alunos_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    alert('Relatório de Estatísticas de Acesso dos Alunos gerado com sucesso!')
  }


  const exportToExcel = () => {
    if (!reportData) return

    // Criar exportador Excel
    const exporter = new ExcelExporter()

    // Dados principais
    const mainData = [
      { metric: t('dashboard.totalStudents'), value: reportData.totalStudents },
      { metric: t('reports.activeStudents'), value: reportData.activeStudents },
      { metric: t('dashboard.instructors'), value: reportData.totalInstructors },
      { metric: t('courses.totalCourses'), value: reportData.totalCourses },
      { metric: t('reports.totalEnrollments'), value: reportData.totalEnrollments },
      { metric: t('reports.coursesCompleted'), value: reportData.completedCourses },
      { metric: t('reports.averageCompletion'), value: `${reportData.averageCompletionRate}%` }
    ]

    // Aba de métricas principais
    exporter.addDataSheet('Métricas Principais', {
      title: 'Relatório SwiftEDU - Métricas Principais',
      headers: ['Métrica', 'Valor'],
      data: mainData.map(item => [item.metric, item.value]),
      metadata: {
        date: new Date().toLocaleDateString('pt-BR'),
        period: `${new Date(dateRange.start).toLocaleDateString('pt-BR')} - ${new Date(dateRange.end).toLocaleDateString('pt-BR')}`,
        user: 'Sistema SwiftEDU'
      }
    })

    // Aba de cursos por categoria
    exporter.addDataSheet('Cursos por Categoria', {
      title: t('reports.coursesByCategory'),
      headers: [t('courses.category'), t('reports.quantity'), 'Percentual (%)'],
      data: reportData.coursesPerCategory.map(item => [
        item.category,
        item.count,
        `${Math.round((item.count / reportData.totalCourses) * 100)}%`
      ]),
      metadata: {
        date: new Date().toLocaleDateString('pt-BR'),
        user: 'Sistema SwiftEDU'
      }
    })

    // Aba de top cursos
    exporter.addDataSheet('Top 5 Cursos', {
      title: t('reports.top5Courses'),
      headers: ['Posição', t('courses.courseTitle'), t('reports.enrollments')],
      data: reportData.topCourses.map((course, index) => [
        `#${index + 1}`,
        course.title,
        course.enrollments
      ]),
      metadata: {
        date: new Date().toLocaleDateString('pt-BR'),
        period: `${new Date(dateRange.start).toLocaleDateString('pt-BR')} - ${new Date(dateRange.end).toLocaleDateString('pt-BR')}`,
        user: 'Sistema SwiftEDU'
      }
    })

    // Aba de matrículas por mês
    if (reportData.enrollmentsByMonth.length > 0) {
      exporter.addDataSheet('Matrículas por Mês', {
        title: 'Evolução de Matrículas',
        headers: ['Mês', 'Quantidade'],
        data: reportData.enrollmentsByMonth.map(item => [
          item.month,
          item.count
        ]),
        metadata: {
          date: new Date().toLocaleDateString('pt-BR'),
          user: 'Sistema SwiftEDU'
        }
      })
    }

    // Adicionar resumo
    exporter.addSummarySheet('Resumo', {
      title: 'Resumo Executivo',
      sections: [
        {
          sectionTitle: 'Estatísticas de Usuários',
          metrics: [
            { label: 'Total de Alunos', value: reportData.totalStudents },
            { label: 'Alunos Ativos', value: reportData.activeStudents },
            { label: 'Total de Instrutores', value: reportData.totalInstructors }
          ]
        },
        {
          sectionTitle: 'Estatísticas de Cursos',
          metrics: [
            { label: 'Total de Cursos', value: reportData.totalCourses },
            { label: 'Cursos Concluídos', value: reportData.completedCourses },
            { label: 'Taxa Média de Conclusão', value: `${reportData.averageCompletionRate}%` }
          ]
        },
        {
          sectionTitle: 'Estatísticas de Matrículas',
          metrics: [
            { label: 'Total de Matrículas', value: reportData.totalEnrollments },
            { label: 'Média de Matrículas por Curso', value: Math.round(reportData.totalEnrollments / Math.max(reportData.totalCourses, 1)) }
          ]
        }
      ]
    })

    exporter.download(`relatorio_swiftedu_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const reports = [
    {
      title: t('reports.gradesHistoryReport'),
      description: t('reports.gradesHistoryReportDesc'),
      type: 'grades',
      icon: GraduationCap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: t('reports.enrollmentReport'),
      description: 'Relatório completo de matrículas e conclusões de cursos',
      type: 'enrollments',
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Estatísticas de Acesso dos Alunos',
      description: 'Acompanhe o acesso dos alunos: frequência, tempo de estudo e engajamento',
      type: 'access',
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gold">{t('reports.title')}</h1>
          <p className="text-gold-300 mt-1">{t('reports.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="primary" 
            icon={<Table className="w-5 h-5" />}
            onClick={exportToExcel}
            title="Exportar para Excel com tabelas dinâmicas"
          >
            {t('reports.export')} Excel (Dinâmico)
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gold-400" />
          <div className="flex items-center gap-2 flex-1">
            <label className="text-gold-300">{t('reports.dateRange')}:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <span className="text-gold-300">{t('reports.to')}</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1 bg-navy-900/50 border border-navy-600 rounded-lg text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-4xl font-bold text-gold">{reportData?.totalEnrollments || 0}</p>
            <p className="text-gold-300 mt-1">{t('reports.enrollments')}</p>
            <p className="text-gold-400 text-sm mt-2">{t('reports.inPeriod')}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-4xl font-bold text-gold">{reportData?.averageCompletionRate || 0}%</p>
            <p className="text-gold-300 mt-1">{t('reports.completionRate')}</p>
            <p className="text-gold-400 text-sm mt-2">{t('reports.overallAverage')}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-4xl font-bold text-gold">{reportData?.activeStudents || 0}</p>
            <p className="text-gold-300 mt-1">{t('reports.activeStudents')}</p>
            <p className="text-gold-400 text-sm mt-2">{t('dashboard.total')}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-4xl font-bold text-gold">{reportData?.totalCourses || 0}</p>
            <p className="text-gold-300 mt-1">{t('courses.title')}</p>
            <p className="text-gold-400 text-sm mt-2">{t('reports.available')}</p>
          </div>
        </Card>
      </div>

      {/* Available Reports */}
      <Card title={t('reports.availableReports')} subtitle={t('reports.selectReport')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {reports.map((report, index) => {
            const Icon = report.icon
            const isGenerating = generatingReport === report.type
            
            return (
              <div key={index} className="border border-gold-500/20 rounded-lg p-4 hover:bg-navy-700/30 transition-colors">
                <div className="flex flex-col items-center text-center">
                  <div className={`p-3 ${report.bgColor} rounded-lg ${report.color} mb-3`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h4 className="font-semibold text-gold mb-1">{report.title}</h4>
                  <p className="text-gold-300 text-sm mb-4">{report.description}</p>
                  <Button 
                    variant="primary" 
                    size="sm"
                    className="w-full"
                    onClick={() => generateReport(report.type)}
                    disabled={isGenerating}
                  >
                    {isGenerating ? t('reports.generating') : t('reports.generateReport')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Data Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Courses */}
        <Card title={t('reports.top5Courses')} subtitle={t('reports.byEnrollments')}>
          <div className="space-y-3 mt-4">
            {reportData?.topCourses.map((course, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gold-400 font-bold">#{index + 1}</span>
                  <span className="text-gold-200">{course.title}</span>
                </div>
                <span className="text-gold-300 font-medium">{course.enrollments} {t('dashboard.students')}</span>
              </div>
            ))}
            {(!reportData?.topCourses || reportData.topCourses.length === 0) && (
              <p className="text-gold-300 text-center py-4">{t('reports.noCoursesInPeriod')}</p>
            )}
          </div>
        </Card>

        {/* Courses by Category */}
        <Card title={t('reports.coursesByCategory')}>
          <div className="space-y-3 mt-4">
            {reportData?.coursesPerCategory.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gold-200">{item.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gold-300 font-medium">{item.count} {t('reports.courses')}</span>
                  <div className="w-24 bg-navy-900/50 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-gold-500 to-gold-600 h-2 rounded-full"
                      style={{ 
                        width: `${Math.min((item.count / (reportData?.totalCourses || 1)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {(!reportData?.coursesPerCategory || reportData.coursesPerCategory.length === 0) && (
              <p className="text-gold-300 text-center py-4">{t('reports.noCategoriesFound')}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}