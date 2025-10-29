# Refatoração do Sistema de Import - Notas

## Problema Original
O Inngest executa DENTRO dos serverless functions do Vercel, que têm timeout de 5 minutos no plano Hobby.
Um único `step.run()` gigante que executava por 4-5 minutos estava sendo morto pelo Vercel.

## Solução: Sistema de Workers Encadeados

Cada **worker individual** dura no máximo **3.5 minutos** e então agenda um novo worker para continuar.
Isso permite que importações levem **horas** se necessário, divididas em workers de 4min.

### Estratégia de Chunking

```
Worker 1 (3.5min) → Worker 2 (3.5min) → Worker 3 (3.5min) → ... → Worker N (completo)
     |                   |                   |                          |
  Discovery          Module 0           Module 1                   Database
```

### Fase 1: Discovery (~30s-1min)
- Escaneia toda a estrutura do Google Drive
- Conta totais: módulos, disciplinas, aulas, testes
- Cria registros de tracking para cada item
- Salva totais no `resume_state`
- **Após Discovery**: Se já passou 3.5min, agenda novo worker

### Fase 2: Processing (1-2min por módulo)
- Processa **1 módulo por vez** (MODULES_PER_CHUNK = 1)
- Baixa arquivos, extrai gabaritos, classifica itens
- **Após cada módulo**: Se já passou 3.5min OU há mais módulos, agenda novo worker
- Resume exato do último módulo processado

### Fase 3: Database Import (~1min)
- Salva estrutura processada no banco
- Cria registros de módulos, disciplinas, aulas, testes
- Apenas executada quando todos os módulos foram processados

## Limites de Tempo

### Por Worker
- **MAX_WORKFLOW_DURATION_MS**: 3.5 minutos (210 segundos)
- **Margem de segurança**: 30 segundos antes do timeout do Vercel (5min)
- **Timeout Inngest**: 4 minutos (finish: '4m')

### Total da Importação
- **Sem limite**: A importação pode levar horas
- **Exemplo**: 20 módulos × 2min/módulo = ~40 minutos total
- **Workers necessários**: ~12 workers de 3.5min cada

## Arquivos Modificados

### `/lib/inngest/functions/import-drive.ts`
- Refatorou `handleImportEvent` com sistema de chunking temporal
- Adicionou `shouldYieldToNewWorker()` para verificar tempo limite
- Reduz `MODULES_PER_CHUNK` para 1 (chunks pequenos)
- Configura timeout para 4 minutos (finish: '4m')
- Agenda continuação via `step.sendEvent('drive/import.continue')`

### `/app/api/import-from-drive/route.ts`
- Adicionou `runDiscoveryPhase()` - fase de descoberta standalone
- Adicionou `runProcessingPhase()` - processamento em batches
- Adicionou `runDatabaseImportPhase()` - importação para banco
- Exportou `getDriveClient()` - cria cliente autenticado

## Fluxo de Execução

```
1. Usuário clica "Importar"
   ↓
2. Worker 1 inicia (event: drive/import.requested)
   - Executa Discovery (30s)
   - Verifica tempo: 30s < 3.5min ✓
   - Processa Módulo 0 (2min)
   - Verifica tempo: 2.5min < 3.5min ✓
   - Processa Módulo 1 (2min)
   - Verifica tempo: 4.5min > 3.5min ✗
   - Salva progresso: moduleIndex = 2
   - Agenda Worker 2
   ↓
3. Worker 2 inicia (event: drive/import.continue)
   - Resume de: moduleIndex = 2
   - Processa Módulo 2 (2min)
   - Processa Módulo 3 (2min)
   - Verifica: ainda há módulos ✗
   - Agenda Worker 3
   ↓
4. Worker 3 inicia
   - Processa Módulo 4 (último)
   - Não há mais módulos ✓
   - Executa Database Import (1min)
   - Retorna: status = 'completed'
```

## Status
- ✅ Discovery Phase implementada
- ✅ Processing Phase com chunking temporal
- ✅ Database Import Phase
- ✅ Sistema de continuação automática
- ✅ Build validado
- ⏳ Testes em produção

## Benefícios

✅ **Cada worker completa em < 4min** → nunca atinge timeout do Vercel (5min)
✅ **Importações podem levar horas** (sem limite de duração total)
✅ **Resume granular** por módulo (se falhar, retoma do último módulo)
✅ **Melhor observabilidade** no Inngest UI (1 worker = 1 run)
✅ **Funciona no plano gratuito** do Inngest (sem limite de runs)
✅ **Funciona no plano Hobby** do Vercel (timeout 5min por função)

## Observações Importantes

1. **Inngest Free Tier**: Não há limite de número de runs, apenas duração por run (15min no free)
2. **Vercel Hobby**: Timeout de 5min por função serverless (não acumulativo entre chamadas)
3. **Cada worker é independente**: Não compartilham estado, usam banco para coordenação
4. **Cancelamento cooperativo**: Checa `cancellation_requested` antes de agendar próximo worker
