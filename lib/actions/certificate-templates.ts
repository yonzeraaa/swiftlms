'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CertificateTemplate } from '@/types/certificates'

/**
 * Obtém todos os templates de certificados
 */
export async function getCertificateTemplates() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      redirect('/student-dashboard')
    }

    const { data: templates, error } = await supabase
      .from('certificate_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      templates: (templates || []) as CertificateTemplate[]
    }
  } catch (error) {
    console.error('Error fetching certificate templates:', error)
    return null
  }
}

/**
 * Obtém template padrão para um tipo de certificado
 */
export async function getDefaultTemplate(certificateType: 'technical' | 'lato-sensu') {
  try {
    const supabase = await createClient()

    const { data: template, error } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('is_active', true)
      .eq('is_default', true)
      .or(`certificate_type.eq.${certificateType},certificate_type.eq.all`)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return template as CertificateTemplate | null
  } catch (error) {
    console.error('Error fetching default template:', error)
    return null
  }
}

/**
 * Cria novo template de certificado
 */
export async function createCertificateTemplate(templateData: {
  name: string
  description?: string
  certificate_type: 'technical' | 'lato-sensu' | 'all'
  html_content: string
  css_content?: string
  is_default?: boolean
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Sem permissão' }
    }

    const { data, error } = await supabase
      .from('certificate_templates')
      .insert({
        name: templateData.name,
        description: templateData.description || null,
        certificate_type: templateData.certificate_type,
        html_content: templateData.html_content,
        css_content: templateData.css_content || null,
        is_default: templateData.is_default || false,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('Error creating certificate template:', error)
    return { success: false, error: error.message || 'Erro ao criar template' }
  }
}

/**
 * Atualiza template de certificado
 */
export async function updateCertificateTemplate(
  templateId: string,
  templateData: {
    name?: string
    description?: string
    html_content?: string
    css_content?: string
    is_active?: boolean
    is_default?: boolean
  }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Sem permissão' }
    }

    const { error } = await supabase
      .from('certificate_templates')
      .update(templateData)
      .eq('id', templateId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error updating certificate template:', error)
    return { success: false, error: error.message || 'Erro ao atualizar template' }
  }
}

/**
 * Deleta template de certificado
 */
export async function deleteCertificateTemplate(templateId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Sem permissão' }
    }

    const { error } = await supabase
      .from('certificate_templates')
      .delete()
      .eq('id', templateId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting certificate template:', error)
    return { success: false, error: error.message || 'Erro ao deletar template' }
  }
}

/**
 * Define template como padrão
 */
export async function setDefaultTemplate(templateId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Sem permissão' }
    }

    const { error } = await supabase
      .from('certificate_templates')
      .update({ is_default: true })
      .eq('id', templateId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('Error setting default template:', error)
    return { success: false, error: error.message || 'Erro ao definir template padrão' }
  }
}

/**
 * Upload de arquivo HTML para template
 */
export async function uploadTemplateFile(file: File, templateId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const fileName = `${templateId}/${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('certificate-templates')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) throw uploadError

    const { error: updateError } = await supabase
      .from('certificate_templates')
      .update({
        storage_path: fileName,
        storage_bucket: 'certificate-templates'
      })
      .eq('id', templateId)

    if (updateError) throw updateError

    return { success: true, path: fileName }
  } catch (error: any) {
    console.error('Error uploading template file:', error)
    return { success: false, error: error.message || 'Erro ao fazer upload do arquivo' }
  }
}
