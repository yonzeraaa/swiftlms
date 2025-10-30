# Variáveis de Ambiente para Vercel

## Instruções de Configuração

Adicione estas variáveis de ambiente no **Vercel Dashboard** (Settings > Environment Variables):

### Otimizações para Google Drive Import

```bash
# Tempo máximo de execução por worker (limite atual ~2.5min)
GOOGLE_DRIVE_IMPORT_CHUNK_MAX_MS=150000

# Timeouts internos otimizados
GOOGLE_DRIVE_DEFAULT_TIMEOUT_MS=180000    # 3 minutos
GOOGLE_DRIVE_LIST_TIMEOUT_MS=180000       # 3 minutos
GOOGLE_DRIVE_EXPORT_TIMEOUT_MS=120000     # 2 minutos

# Configuração do runner em background (Vercel Pro)
GOOGLE_DRIVE_BACKGROUND_MAX_RUNTIME_MS=780000   # 13 minutos (abaixo do limite de 13m20s do plano Pro)
GOOGLE_DRIVE_BACKGROUND_SAFETY_MS=60000         # margem antes de reagendar
GOOGLE_DRIVE_BACKGROUND_LOOP_DELAY_MS=1500      # espera entre chunks
GOOGLE_DRIVE_RUNNER_SECRET=defina-um-token-unico
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

- **GOOGLE_DRIVE_IMPORT_CHUNK_MAX_MS**: Tempo máximo que cada chunk individual (discovery/processing/database) pode executar antes de salvar estado e reagendar.

- **GOOGLE_DRIVE_DEFAULT_TIMEOUT_MS**: Timeout padrão para operações individuais do Google Drive API.

- **GOOGLE_DRIVE_LIST_TIMEOUT_MS**: Timeout específico para listagem de arquivos em pastas grandes.

- **GOOGLE_DRIVE_EXPORT_TIMEOUT_MS**: Timeout para exportação de arquivos (Google Docs, Sheets, etc).

- **GOOGLE_DRIVE_BACKGROUND_MAX_RUNTIME_MS**: Tempo total disponível para o runner em background antes de reagendar uma nova execução.

- **GOOGLE_DRIVE_BACKGROUND_SAFETY_MS**: Margem de segurança usada para agendar o próximo chunk antes de atingir o limite máximo.

- **GOOGLE_DRIVE_BACKGROUND_LOOP_DELAY_MS**: Intervalo entre os chunks processados dentro do mesmo runner (evita hot loop).

- **GOOGLE_DRIVE_RUNNER_SECRET**: Token compartilhado para que apenas chamadas internas possam reagendar o runner (`/api/import-from-drive-runner`).
