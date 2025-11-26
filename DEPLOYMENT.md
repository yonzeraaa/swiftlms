# Configuração de Deploy - SwiftEdu

## Domínio Principal
- **URL de Produção**: https://swiftedu-rose.vercel.app
- **Plataforma**: Vercel

## Configurações Necessárias no Supabase

### 1. URL de Redirecionamento
No painel do Supabase, adicione as seguintes URLs em **Authentication > URL Configuration**:

- Site URL: `https://swiftedu-rose.vercel.app`
- Redirect URLs:
  - `https://swiftedu-rose.vercel.app/*`
  - `https://swiftedu-rose.vercel.app/auth/callback`
  - `https://swiftedu-rose.vercel.app`

### 2. Variáveis de Ambiente no Vercel

Certifique-se de que as seguintes variáveis estejam configuradas no Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://mdzgnktlsmkjecdbermo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kemdua3Rsc21ramVjZGJlcm1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODE3OTcsImV4cCI6MjA2OTY1Nzc5N30.wVS4jMNTenVRSVtiuHFKo9OZ_RfUWiKV8ojN7ch67go
NEXT_PUBLIC_APP_URL=https://swiftedu-rose.vercel.app
NODE_ENV=production
```

## Deploy

1. **Commit e Push**: Todas as mudanças são automaticamente deployadas ao fazer push para a branch `master`
2. **Verificação**: Acesse https://swiftedu-rose.vercel.app após o deploy
3. **Teste de Autenticação**: Faça login e teste a funcionalidade de matrícula

## Domínio Customizado (Futuro)

Quando quiser voltar a usar o domínio customizado (www.swiftedu.com.br):
1. Configure os cookies com domain específico
2. Ajuste as variáveis de ambiente
3. Configure CORS no Supabase para aceitar o domínio