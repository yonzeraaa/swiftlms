# Configuração do Inngest para Importações do Google Drive

## Por que Inngest?

O sistema anterior usava `after()` do Next.js, que tem limitações severas:
- **Timeout curto**: 10-15 segundos no Vercel (dependendo do plano)
- **Sem retry automático**: Se falhar, o job é perdido
- **Sem visibilidade**: Difícil debugar problemas

Com Inngest, obtemos:
- ✅ **Timeout de até 4 horas** (free tier) ou ilimitado (paid)
- ✅ **Retry automático** com backoff exponencial
- ✅ **Dashboard visual** para monitorar jobs
- ✅ **Logs detalhados** de cada step
- ✅ **Free tier generoso**: 1000 jobs/mês, 50k steps

## Setup - Passo a Passo

### 1. Criar conta no Inngest

1. Acesse [https://app.inngest.com/sign-up](https://app.inngest.com/sign-up)
2. Crie uma conta gratuita (GitHub, Google, ou email)
3. Crie um novo "Project" (ex: "SwiftEDU Production")

### 2. Obter as chaves de API

1. No dashboard do Inngest, vá em **Settings > Keys**
2. Copie as seguintes chaves:
   - **Event Key** (começa com `inngest-...`)
   - **Signing Key** (começa com `signkey-...`)

### 3. Configurar variáveis de ambiente

#### Desenvolvimento Local

Crie/edite o arquivo `.env.local`:

```bash
# Inngest Configuration
INNGEST_EVENT_KEY=seu_event_key_aqui
INNGEST_SIGNING_KEY=seu_signing_key_aqui
```

#### Produção (Vercel)

1. Acesse o dashboard do Vercel
2. Vá em **Settings > Environment Variables**
3. Adicione as variáveis:
   - `INNGEST_EVENT_KEY` (Production)
   - `INNGEST_SIGNING_KEY` (Production)

### 4. Configurar Webhook do Inngest

Após fazer deploy no Vercel:

1. No dashboard do Inngest, vá em **Apps**
2. Clique em **Create App** ou **Sync App**
3. Cole a URL do seu endpoint Inngest:
   ```
   https://www.swiftedu.com.br/api/inngest
   ```
4. Clique em **Sync**

O Inngest irá descobrir automaticamente as funções registradas.

### 5. Desenvolvimento Local (Opcional)

Para testar localmente:

1. Instale a CLI do Inngest:
   ```bash
   npm install -g inngest-cli
   ```

2. Inicie o dev server do Inngest:
   ```bash
   npx inngest-cli@latest dev
   ```

3. Acesse [http://localhost:8288](http://localhost:8288) para ver o dashboard local

4. Inicie sua aplicação Next.js:
   ```bash
   npm run dev
   ```

O Inngest Dev Server detectará automaticamente seu endpoint em `http://localhost:3000/api/inngest`

## Como Funciona

### Fluxo de Importação

```
1. Usuário clica em "Importar do Drive"
   ↓
2. API cria job no banco (drive_import_jobs)
   ↓
3. API dispara evento Inngest: "drive/import.requested"
   ↓
4. API retorna 202 Accepted (importId)
   ↓
5. Inngest recebe evento e executa função
   ↓
6. Função processa importação (pode levar horas)
   ↓
7. Frontend poll status via /api/import-from-drive-status
   ↓
8. Ao completar, job é marcado como "completed"
```

### Retry Automático

Se a importação falhar (erro de rede, timeout, etc):
- Inngest automaticamente tenta novamente (até 3 vezes)
- Usa backoff exponencial entre tentativas
- Logs de todas tentativas ficam disponíveis no dashboard

### Monitoramento

Dashboard do Inngest mostra:
- ✅ Jobs executando no momento
- ✅ Jobs completados
- ✅ Jobs com erro
- ✅ Tempo de execução
- ✅ Logs detalhados de cada step

## Troubleshooting

### Job não inicia

1. Verifique as variáveis de ambiente no Vercel
2. Confirme que fez sync do endpoint no Inngest
3. Verifique logs do Vercel em **Deployments > Logs**

### Job fica travado

1. Acesse dashboard do Inngest
2. Procure pelo `importId` nos logs
3. Veja qual step falhou
4. Se necessário, pode fazer retry manual

### Como resetar jobs travados antigos

Execute no Supabase SQL Editor:

```sql
-- Marcar jobs antigos travados como falhos
UPDATE drive_import_jobs
SET
  status = 'failed',
  error = 'Job travado - sistema migrado para Inngest',
  finished_at = NOW()
WHERE
  status = 'processing'
  AND started_at < NOW() - INTERVAL '1 hour';
```

## Custos

**Free Tier** (atual):
- 1.000 jobs/mês
- 50.000 steps/mês
- Suficiente para ~300 importações/mês (assumindo 170 steps por importação)

**Paid Plans** (se necessário):
- **Starter**: $20/mês - 10k jobs, 500k steps
- **Pro**: $200/mês - 100k jobs, 5M steps

## Links Úteis

- [Inngest Dashboard](https://app.inngest.com)
- [Inngest Docs](https://www.inngest.com/docs)
- [Status Page](https://status.inngest.com)
