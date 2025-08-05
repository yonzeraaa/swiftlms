# Configuração Supabase - SwiftEDU

## Status da Integração

✅ **Concluído:**
- Banco de dados configurado com todas as tabelas necessárias
- Tipos TypeScript gerados automaticamente
- Cliente Supabase configurado (browser e server)
- Página de cursos integrada com dados reais
- Sistema de autenticação implementado

## Estrutura do Banco de Dados

### Tabelas Principais:
- `profiles` - Perfis de usuários
- `courses` - Cursos disponíveis
- `course_modules` - Módulos dos cursos
- `lessons` - Aulas dentro dos módulos
- `enrollments` - Matrículas dos alunos
- `lesson_progress` - Progresso das aulas
- `course_reviews` - Avaliações dos cursos

### Views:
- `course_statistics` - Estatísticas agregadas dos cursos

## Criando um Usuário de Teste

Para criar um usuário administrador, execute o seguinte SQL no painel do Supabase:

```sql
-- Primeiro, crie um usuário no Supabase Auth (Dashboard > Authentication > Users > Invite User)
-- Email: admin@swiftedu.com
-- Senha: (defina uma senha segura)

-- Depois de criar o usuário, atualize o perfil dele:
UPDATE profiles 
SET role = 'admin', 
    full_name = 'Administrador SwiftEDU'
WHERE email = 'admin@swiftedu.com';
```

## Próximos Passos

### 1. Configurar RLS (Row Level Security)
As políticas de segurança ainda precisam ser configuradas para proteger os dados.

### 2. Implementar funcionalidades pendentes:
- Sistema de matrículas
- Progresso de aprendizagem
- Dashboard com estatísticas reais
- Upload de conteúdo dos cursos
- Sistema de avaliações

### 3. Melhorias sugeridas:
- Implementar cache para otimizar consultas
- Adicionar paginação nas listagens
- Implementar busca avançada
- Sistema de notificações

## Arquivos Importantes

- `/lib/database.types.ts` - Tipos TypeScript do banco
- `/lib/supabase/client.ts` - Cliente para browser
- `/lib/supabase/server.ts` - Cliente para server components
- `/middleware.ts` - Middleware de autenticação (a ser implementado)

## Variáveis de Ambiente

Certifique-se de ter as seguintes variáveis no `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

## Configuração do Storage para Avatares

Execute o seguinte SQL no painel do Supabase para criar o bucket de avatares:

```sql
-- Executar o script em /scripts/create-avatar-bucket.sql
```

Ou manualmente no Dashboard:
1. Vá para Storage
2. Crie um novo bucket chamado "avatars"
3. Marque como público
4. Configure o limite de tamanho para 5MB
5. Configure os tipos permitidos: image/jpeg, image/png, image/gif, image/webp