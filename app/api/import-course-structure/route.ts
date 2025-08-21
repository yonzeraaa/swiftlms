import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

interface Subject {
  code: string
  name: string
  hours: number
  description: string
}

interface Module {
  title: string
  subjects: Subject[]
  totalHours: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Receber o arquivo
    const formData = await request.formData()
    const file = formData.get('file') as File
    const courseId = formData.get('courseId') as string

    if (!file || !courseId) {
      return NextResponse.json({ error: 'Arquivo e ID do curso são obrigatórios' }, { status: 400 })
    }

    // Converter o arquivo para buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Ler o arquivo Excel
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
    
    console.log('Primeiras 10 linhas do Excel:')
    data.slice(0, 10).forEach((row, index) => {
      console.log(`Linha ${index}:`, row)
    })

    // Processar os dados
    const modules: Module[] = []
    let currentModule: Module | null = null

    console.log('Total de linhas no Excel:', data.length)
    
    data.forEach((row, index) => {
      if (row[1] && typeof row[1] === 'string') {
        console.log(`Linha ${index}: ${row[1]}`)
        
        // Verificar se é um módulo
        if (row[1].includes('MÓDULO')) {
          console.log('Módulo encontrado:', row[1])
          if (currentModule) {
            modules.push(currentModule)
          }
          
          currentModule = {
            title: row[1].trim() + ' ' + (row[2] || '').trim(),
            subjects: [],
            totalHours: 0
          }
        } 
        // Verificar se é uma disciplina (códigos como DCA01, LTA01, GPT01, etc.)
        else if (row[1].match(/^[A-Z]{3}\d{2}/)) {
          console.log('Disciplina encontrada:', row[1])
          if (currentModule && row[2] && row[3]) {
            const subject = {
              code: row[1].trim(),
              name: row[2].trim(),
              hours: parseInt(row[3]) || 0,
              description: row[4] ? row[4].trim() : ''
            }
            console.log('Adicionando disciplina:', subject)
            currentModule.subjects.push(subject)
            currentModule.totalHours += subject.hours
          }
        }
      }
    })

    // Adicionar o último módulo
    if (currentModule) {
      modules.push(currentModule)
    }

    console.log('Total de módulos processados:', modules.length)
    console.log('Módulos:', modules.map(m => ({ 
      title: m.title, 
      totalHours: m.totalHours,
      subjectsCount: m.subjects.length 
    })))

    // Importar para o banco de dados
    let totalModulesImported = 0
    let totalSubjectsImported = 0

    // Primeiro, buscar o maior order_index existente para este curso
    const { data: existingModules } = await supabase
      .from('course_modules')
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1)

    const startIndex = existingModules && existingModules.length > 0 
      ? (existingModules[0].order_index + 1) 
      : 0

    for (let i = 0; i < modules.length; i++) {
      const module = modules[i]
      
      // Criar o módulo
      const { data: moduleData, error: moduleError } = await supabase
        .from('course_modules')
        .insert({
          course_id: courseId,
          title: module.title,
          order_index: startIndex + i,
          total_hours: module.totalHours,
          is_required: true
        })
        .select()
        .single()

      if (moduleError) {
        console.error('Erro ao criar módulo:', moduleError)
        continue
      }

      totalModulesImported++

      // Criar as disciplinas
      for (const subject of module.subjects) {
        // Primeiro, criar ou buscar a disciplina
        const { data: existingSubject } = await supabase
          .from('subjects')
          .select()
          .eq('code', subject.code)
          .single()

        let subjectId: string

        if (existingSubject) {
          // Atualizar disciplina existente
          const { error: updateError } = await supabase
            .from('subjects')
            .update({
              name: subject.name,
              description: subject.description,
              hours: subject.hours
            })
            .eq('id', existingSubject.id)

          if (updateError) {
            console.error('Erro ao atualizar disciplina:', updateError)
            continue
          }

          subjectId = existingSubject.id
        } else {
          // Criar nova disciplina
          const { data: newSubject, error: createError } = await supabase
            .from('subjects')
            .insert({
              code: subject.code,
              name: subject.name,
              description: subject.description,
              hours: subject.hours
            })
            .select()
            .single()

          if (createError) {
            console.error('Erro ao criar disciplina:', createError)
            continue
          }

          subjectId = newSubject.id
        }

        // Associar disciplina ao módulo
        const { error: linkError } = await supabase
          .from('module_subjects')
          .insert({
            module_id: moduleData.id,
            subject_id: subjectId,
            order_index: module.subjects.indexOf(subject)
          })

        if (linkError) {
          console.error('Erro ao associar disciplina ao módulo:', linkError)
          continue
        }

        totalSubjectsImported++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${totalModulesImported} módulos e ${totalSubjectsImported} disciplinas importados`,
      modulesImported: totalModulesImported,
      subjectsImported: totalSubjectsImported
    })

  } catch (error) {
    console.error('Erro na importação:', error)
    return NextResponse.json(
      { error: 'Erro ao processar arquivo' },
      { status: 500 }
    )
  }
}