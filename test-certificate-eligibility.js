const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testCertificateEligibility() {
  try {
    // Fazer login primeiro
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'r_steel-starsiege@hotmail.com',
      password: 'sua_senha_aqui' // Você precisa inserir a senha
    })

    if (authError) {
      console.error('Erro ao fazer login:', authError)
      return
    }

    console.log('Login bem-sucedido:', authData.user.id)

    // Buscar enrollments do usuário
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('*, course:courses(*)')
      .eq('user_id', authData.user.id)

    if (enrollError) {
      console.error('Erro ao buscar enrollments:', enrollError)
      return
    }

    console.log('Enrollments encontrados:', enrollments.length)

    if (enrollments.length > 0) {
      const enrollment = enrollments[0]
      const courseId = enrollment.course.id
      const enrollmentId = enrollment.id

      console.log('Testando elegibilidade para:')
      console.log('- Course ID:', courseId)
      console.log('- Enrollment ID:', enrollmentId)

      // Buscar módulos do curso
      const { data: modules } = await supabase
        .from('course_modules')
        .select('id')
        .eq('course_id', courseId)
      
      console.log('Módulos encontrados:', modules?.length)

      if (modules) {
        const moduleIds = modules.map(m => m.id)
        
        // Contar lições
        const { count: totalLessons } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .in('module_id', moduleIds)

        console.log('Total de lições:', totalLessons)

        // Contar lições completadas
        const { count: completedLessons } = await supabase
          .from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('enrollment_id', enrollmentId)
          .eq('is_completed', true)

        console.log('Lições completadas:', completedLessons)

        // Buscar notas de testes
        const { data: testGrades } = await supabase
          .from('test_grades')
          .select('best_score')
          .eq('user_id', authData.user.id)
          .eq('course_id', courseId)

        console.log('Notas de testes:', testGrades)

        const bestScore = testGrades?.length > 0 
          ? Math.max(...testGrades.map(g => g.best_score || 0))
          : 0

        console.log('Melhor nota:', bestScore)

        // Verificar se já existe solicitação
        const { data: existingRequest } = await supabase
          .from('certificate_requests')
          .select('*')
          .eq('enrollment_id', enrollmentId)
          .single()

        console.log('Solicitação existente:', existingRequest)

        // Tentar criar solicitação
        if (!existingRequest) {
          const { data: newRequest, error: insertError } = await supabase
            .from('certificate_requests')
            .insert({
              enrollment_id: enrollmentId,
              user_id: authData.user.id,
              course_id: courseId,
              total_lessons: totalLessons || 0,
              completed_lessons: completedLessons || 0,
              status: 'pending',
              request_date: new Date().toISOString()
            })
            .select()
            .single()

          if (insertError) {
            console.error('Erro ao inserir solicitação:', insertError)
            console.error('Detalhes do erro:', JSON.stringify(insertError, null, 2))
          } else {
            console.log('Solicitação criada com sucesso:', newRequest)
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro geral:', error)
  } finally {
    process.exit()
  }
}

testCertificateEligibility()