// Script para criar um usuário de teste
// Para executar: node scripts/create-test-user.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas')
  console.log('Certifique-se de ter NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  try {
    // Criar usuário admin
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'admin@swiftedu.com',
      password: 'Admin@123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Administrador SwiftEDU',
        role: 'admin'
      }
    })

    if (error) {
      console.error('❌ Erro ao criar usuário:', error.message)
      return
    }

    console.log('✅ Usuário criado com sucesso!')
    console.log('📧 Email: admin@swiftedu.com')
    console.log('🔑 Senha: Admin@123')
    console.log('')
    console.log('⚠️  IMPORTANTE: Por segurança, altere a senha após o primeiro login!')

    // Atualizar perfil do usuário
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: 'Administrador SwiftEDU',
          role: 'admin'
        })
        .eq('id', data.user.id)

      if (profileError) {
        console.error('⚠️  Aviso: Erro ao atualizar perfil:', profileError.message)
      }
    }

  } catch (err) {
    console.error('❌ Erro inesperado:', err)
  }
}

createTestUser()