# SwiftEDU - Guia de Deploy

## Variáveis de Ambiente Necessárias

Para fazer o deploy desta aplicação, você precisa configurar as seguintes variáveis de ambiente no seu serviço de hospedagem (Vercel, Netlify, etc.):

```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

## Como obter as credenciais do Supabase

1. Acesse seu projeto no [Painel do Supabase](https://supabase.com/dashboard)
2. Vá para Settings > API
3. Copie a URL do projeto e a chave anônima (anon public)

## Configuração no Vercel

1. No painel do Vercel, vá para as configurações do projeto
2. Navegue até "Environment Variables"
3. Adicione as duas variáveis de ambiente mencionadas acima
4. Faça o redeploy do projeto

## Configuração no Netlify

1. No painel do Netlify, vá para Site settings > Environment
2. Adicione as variáveis de ambiente
3. Faça o redeploy do projeto

## Build Local

Para testar o build localmente:

1. Crie um arquivo `.env.local` na raiz do projeto
2. Adicione as variáveis de ambiente
3. Execute `npm run build`

## Importante

- Nunca commite o arquivo `.env.local` com suas credenciais reais
- As variáveis de ambiente devem ser configuradas diretamente no serviço de hospedagem
- O arquivo `.env.local.example` serve como template para as variáveis necessárias