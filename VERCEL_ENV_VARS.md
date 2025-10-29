# Variáveis de Ambiente para Vercel

## Instruções de Configuração

Adicione estas variáveis de ambiente no **Vercel Dashboard** (Settings > Environment Variables):

### Otimizações para Google Drive Import

```bash
# Chunk de 4 minutos (deixa 1min de buffer para timeout do Vercel Hobby de 5min)
GOOGLE_DRIVE_IMPORT_CHUNK_MAX_MS=240000

# Timeouts internos otimizados
GOOGLE_DRIVE_DEFAULT_TIMEOUT_MS=180000    # 3 minutos
GOOGLE_DRIVE_LIST_TIMEOUT_MS=180000       # 3 minutos
GOOGLE_DRIVE_EXPORT_TIMEOUT_MS=120000     # 2 minutos
```

## Como Adicionar no Vercel

1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** > **Environment Variables**
4. Adicione cada variável acima
5. Selecione os ambientes: **Production**, **Preview**, **Development**
6. Clique em **Save**
7. **Redeploy** o projeto para aplicar as mudanças

## Explicação

- **GOOGLE_DRIVE_IMPORT_CHUNK_MAX_MS**: Tempo máximo que cada chunk de importação pode executar. Configurado em 4 minutos para dar 1 minuto de margem antes do timeout do Vercel (5 minutos no plano Hobby).

- **GOOGLE_DRIVE_DEFAULT_TIMEOUT_MS**: Timeout padrão para operações individuais do Google Drive API.

- **GOOGLE_DRIVE_LIST_TIMEOUT_MS**: Timeout específico para listagem de arquivos em pastas grandes.

- **GOOGLE_DRIVE_EXPORT_TIMEOUT_MS**: Timeout para exportação de arquivos (Google Docs, Sheets, etc).

## Upgrade do Inngest (Opcional)

Se as importações ainda falharem por exceder o limite total do workflow do Inngest Free tier, considere:

1. **Fazer upgrade para Inngest Cloud** (plano pago ~$20-50/mês)
   - Remove limite de duração total do workflow
   - Suporta importações de qualquer tamanho

2. **Como fazer upgrade**:
   - Acesse https://www.inngest.com/
   - Faça login com sua conta
   - Vá em Settings > Billing
   - Escolha um plano pago

3. **Após upgrade**:
   - As importações poderão executar por horas sem limite
   - Sistema de chunks continuará funcionando para resiliência
