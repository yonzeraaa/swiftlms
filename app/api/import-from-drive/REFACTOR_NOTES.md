# Refatoração do Sistema de Import - Notas

## Problema
O Inngest executa DENTRO dos serverless functions do Vercel, que têm timeout de 5 minutos no plano Hobby.
Um único `step.run()` gigante que executava por 4-5 minutos estava sendo morto pelo Vercel.

## Solução
Dividir o trabalho em múltiplos `step.run()` pequenos (< 2min cada):

### Fase 1: Discovery (~30s-1min)
- Escaneia toda a estrutura do Google Drive
- Conta totais: módulos, disciplinas, aulas, testes
- Cria registros de tracking para cada item
- Salva totais no `resume_state`

### Fase 2: Processing (1-2min por batch)
- Processa N módulos por vez (configurável: MODULES_PER_STEP = 2)
- Baixa arquivos, extrai gabaritos, etc
- Se houver mais módulos, retorna `status: 'partial'` e agenda continuação
- Resume do ponto onde parou

### Fase 3: Database Import (~1min)
- Salva estrutura processada no banco
- Cria registros de módulos, disciplinas, aulas, testes

## Arquivos Modificados

### `/lib/inngest/functions/import-drive.ts`
- Refatorou `handleImportEvent` para usar 3 steps separados
- Adicionou helper `getJobContext`
- Gerencia resume_state entre fases

### `/app/api/import-from-drive/route.ts`
- Adicionou `runDiscoveryPhase()` - extrai discovery do monolito
- TODO: Adicionar `runProcessingPhase()` - processar batches de módulos
- TODO: Adicionar `runDatabaseImportPhase()` - salvar no banco
- TODO: Exportar `getDriveClient()` - criar cliente do Google Drive

## Status
- ✅ Discovery Phase implementada
- ⏳ Processing Phase (em andamento)
- ⏳ Database Import Phase (pendente)
- ⏳ Testes e validação

## Benefícios
- Cada step completa em < 2min → nunca atinge timeout do Vercel
- Workflow pode executar por horas se necessário
- Resume granular entre fases
- Melhor observabilidade (3 steps separados no Inngest UI)
