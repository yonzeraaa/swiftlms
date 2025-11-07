import { createClient } from '@/lib/supabase/server'

/**
 * Serviço para limpeza de arquivos órfãos e templates inativos
 */

export interface CleanupResult {
  orphanedFiles: string[]
  deletedFiles: number
  errors: string[]
}

/**
 * Encontra e remove arquivos no storage que não têm registro no banco
 * Remove apenas arquivos com mais de 24h de idade
 */
export async function cleanupOrphanedTemplates(): Promise<CleanupResult> {
  const supabase = await createClient()
  const result: CleanupResult = {
    orphanedFiles: [],
    deletedFiles: 0,
    errors: [],
  }

  try {
    // Buscar todos os arquivos no storage
    const { data: folders, error: foldersError } = await supabase.storage
      .from('excel-templates')
      .list()

    if (foldersError) {
      result.errors.push(`Erro ao listar pastas: ${foldersError.message}`)
      return result
    }

    // Buscar todos os templates no banco
    const { data: templates, error: templatesError } = await supabase
      .from('excel_templates')
      .select('storage_path')

    if (templatesError) {
      result.errors.push(`Erro ao buscar templates: ${templatesError.message}`)
      return result
    }

    const dbPaths = new Set(templates?.map(t => t.storage_path) || [])
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    // Verificar arquivos em cada pasta (categoria)
    for (const folder of folders || []) {
      if (!folder.name) continue

      const { data: files, error: filesError } = await supabase.storage
        .from('excel-templates')
        .list(folder.name)

      if (filesError) {
        result.errors.push(`Erro ao listar arquivos em ${folder.name}: ${filesError.message}`)
        continue
      }

      for (const file of files || []) {
        const fullPath = `${folder.name}/${file.name}`

        // Verificar se arquivo existe no banco
        if (!dbPaths.has(fullPath)) {
          const fileDate = new Date(file.created_at).getTime()

          // Só deletar arquivos com mais de 24h
          if (fileDate < oneDayAgo) {
            result.orphanedFiles.push(fullPath)

            // Tentar deletar
            const { error: deleteError } = await supabase.storage
              .from('excel-templates')
              .remove([fullPath])

            if (deleteError) {
              result.errors.push(`Erro ao deletar ${fullPath}: ${deleteError.message}`)
            } else {
              result.deletedFiles++
              console.log(`[TemplateCleanup] Arquivo órfão deletado: ${fullPath}`)
            }
          }
        }
      }
    }

    console.log(
      `[TemplateCleanup] Limpeza concluída. ${result.deletedFiles} arquivos deletados, ${result.errors.length} erros.`
    )

    return result
  } catch (error) {
    result.errors.push(
      `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    )
    return result
  }
}

/**
 * Remove templates inativos e seus arquivos após período de retenção
 * @param retentionDays Número de dias para manter templates inativos (padrão: 90)
 */
export async function cleanupInactiveTemplates(retentionDays = 90): Promise<CleanupResult> {
  const supabase = await createClient()
  const result: CleanupResult = {
    orphanedFiles: [],
    deletedFiles: 0,
    errors: [],
  }

  try {
    // Calcular data limite
    const retentionDate = new Date()
    retentionDate.setDate(retentionDate.getDate() - retentionDays)

    // Buscar templates inativos antigos
    const { data: templates, error: templatesError } = await supabase
      .from('excel_templates')
      .select('id, storage_path')
      .eq('is_active', false)
      .lt('updated_at', retentionDate.toISOString())

    if (templatesError) {
      result.errors.push(`Erro ao buscar templates inativos: ${templatesError.message}`)
      return result
    }

    if (!templates || templates.length === 0) {
      console.log('[TemplateCleanup] Nenhum template inativo para limpar')
      return result
    }

    // Deletar cada template e seu arquivo
    for (const template of templates) {
      // Deletar arquivo do storage
      const { error: storageError } = await supabase.storage
        .from('excel-templates')
        .remove([template.storage_path])

      if (storageError) {
        result.errors.push(
          `Erro ao deletar arquivo ${template.storage_path}: ${storageError.message}`
        )
      } else {
        result.deletedFiles++
      }

      // Deletar registro do banco
      const { error: dbError } = await supabase
        .from('excel_templates')
        .delete()
        .eq('id', template.id)

      if (dbError) {
        result.errors.push(`Erro ao deletar template ${template.id}: ${dbError.message}`)
      }

      console.log(`[TemplateCleanup] Template inativo removido: ${template.id}`)
    }

    console.log(
      `[TemplateCleanup] ${result.deletedFiles} templates inativos removidos, ${result.errors.length} erros.`
    )

    return result
  } catch (error) {
    result.errors.push(
      `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    )
    return result
  }
}

/**
 * Executa todas as rotinas de limpeza
 */
export async function runFullCleanup(): Promise<{
  orphaned: CleanupResult
  inactive: CleanupResult
}> {
  console.log('[TemplateCleanup] Iniciando limpeza completa...')

  const orphaned = await cleanupOrphanedTemplates()
  const inactive = await cleanupInactiveTemplates()

  const totalDeleted = orphaned.deletedFiles + inactive.deletedFiles
  const totalErrors = orphaned.errors.length + inactive.errors.length

  console.log(`[TemplateCleanup] Limpeza completa finalizada: ${totalDeleted} arquivos deletados, ${totalErrors} erros.`)

  return { orphaned, inactive }
}
