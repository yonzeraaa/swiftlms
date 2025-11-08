import { createClient } from '@/lib/supabase/client'
import { ExcelTemplateEngine } from './excel-template-engine'
import { fetchUsersData, mapUsersDataForTemplate } from './excel-template-mappers/users-mapper'
import { fetchStudentHistoryData, mapStudentHistoryDataForTemplate } from './excel-template-mappers/student-history-mapper'
import { fetchGradesData, mapGradesDataForTemplate } from './excel-template-mappers/grades-mapper'
import { fetchEnrollmentsData, mapEnrollmentsDataForTemplate } from './excel-template-mappers/enrollments-mapper'
import { fetchAccessData, mapAccessDataForTemplate } from './excel-template-mappers/access-mapper'

/**
 * Hook para usar templates em relatórios
 */
export async function generateReportWithTemplate(
  category: string,
  templateId?: string,
  params?: { userId?: string; courseId?: string; dateRange?: { start: string; end: string } }
): Promise<Blob | null> {
  const supabase = createClient()

  try {
    // Se não foi especificado template, buscar o ativo para a categoria
    let template
    if (templateId) {
      const { data } = await supabase
        .from('excel_templates')
        .select('*')
        .eq('id', templateId)
        .single()
      template = data
    } else {
      const { data } = await supabase
        .from('excel_templates')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      template = data
    }

    if (!template) {
      console.log('Nenhum template encontrado para categoria:', category)
      return null
    }

    // Buscar dados conforme categoria
    let reportData
    if (category === 'users') {
      const userData = await fetchUsersData()
      reportData = mapUsersDataForTemplate(userData)
    } else if (category === 'student-history') {
      if (!params?.userId) {
        throw new Error('userId é obrigatório para relatório de histórico do aluno')
      }
      const historyData = await fetchStudentHistoryData(params.userId, params.courseId)
      reportData = mapStudentHistoryDataForTemplate(historyData)
    } else if (category === 'grades') {
      const gradesData = await fetchGradesData()
      reportData = mapGradesDataForTemplate(gradesData)
    } else if (category === 'enrollments') {
      const enrollmentsData = await fetchEnrollmentsData(params?.dateRange)
      reportData = mapEnrollmentsDataForTemplate(enrollmentsData)
    } else if (category === 'access') {
      const accessData = await fetchAccessData()
      reportData = mapAccessDataForTemplate(accessData)
    } else {
      throw new Error(`Categoria não suportada: ${category}`)
    }

    // Extrair mapeamentos customizados do template (se existirem)
    const customMappings = template.metadata?.mappings

    // Gerar relatório usando template com mapeamentos customizados
    const engine = new ExcelTemplateEngine(template)
    await engine.loadTemplate()
    await engine.fillTemplate(reportData, customMappings)
    const buffer = await engine.generate()
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer

    return new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  } catch (error) {
    console.error('Erro ao gerar relatório com template:', error)
    throw error
  }
}

/**
 * Busca templates disponíveis para uma categoria
 */
export async function getTemplatesForCategory(category: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('excel_templates')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error

  return data || []
}
