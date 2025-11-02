import { createClient } from '@/lib/supabase/client'
import { ExcelTemplateEngine } from './excel-template-engine'
import { fetchUsersData, mapUsersDataForTemplate } from './excel-template-mappers/users-mapper'

/**
 * Hook para usar templates em relatórios
 */
export async function generateReportWithTemplate(
  category: string,
  templateId?: string
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
    } else {
      throw new Error(`Categoria não suportada ainda: ${category}`)
    }

    // Gerar relatório usando template
    const engine = new ExcelTemplateEngine(template)
    await engine.loadTemplate()
    await engine.fillTemplate(reportData)
    const buffer = await engine.generate()

    return new Blob([buffer], {
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
