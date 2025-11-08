# 🚀 INSTRUÇÕES DE EXECUÇÃO - Suite de Testes SwiftLMS

> **Versão:** 1.0.0
> **Data:** 2025-11-08
> **Pré-requisitos:** Node.js 22+, npm 10+

---

## 📋 ÍNDICE

- [1. Setup Inicial](#1-setup-inicial)
- [2. Executando Testes](#2-executando-testes)
- [3. Variáveis de Ambiente](#3-variáveis-de-ambiente)
- [4. Troubleshooting](#4-troubleshooting)
- [5. CI/CD](#5-cicd)

---

## 1. SETUP INICIAL

### 1.1 Instalar Dependências

```bash
# Instalar dependências npm
npm install

# Instalar browsers do Playwright (apenas para E2E)
npm run playwright:install
```

### 1.2 Configurar Variáveis de Ambiente

Crie arquivo `.env.test.local` (não commitar):

```bash
# Supabase (usar instância de teste ou local)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-de-teste
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-de-teste

# Opcional: URLs customizadas para testes
SUPABASE_TEST_URL=http://localhost:54321  # Se usar Supabase local
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
```

### 1.3 Setup de Banco de Dados (Opcional)

**Opção A: Supabase Local (Recomendado)**

```bash
# Instalar Supabase CLI
brew install supabase/tap/supabase  # macOS
# ou
npm install -g supabase  # Qualquer OS

# Iniciar Supabase local
supabase start

# Aplicar migrações
supabase db push

# Obter credenciais
supabase status
```

**Opção B: Instância de Teste no Supabase Cloud**

1. Criar projeto separado "swiftlms-test" no Supabase
2. Aplicar migrações: `supabase db push --linked`
3. Configurar RLS policies (mesmo do projeto principal)

---

## 2. EXECUTANDO TESTES

### 2.1 Testes Unitários

```bash
# Watch mode (desenvolvimento)
npm run test

# Run once
npm run test:unit

# Com coverage
npm run test:coverage

# Arquivo específico
npm run test -- tests/unit/lib/grades/calculator.test.ts
```

**Saída esperada:**
```
✓ tests/unit/lib/validators/email.test.ts (8 tests)
✓ tests/unit/lib/validators/password.test.ts (9 tests)
✓ tests/unit/lib/grades/calculator.test.ts (20 tests)
✓ tests/unit/lib/services/TestGradingService.test.ts (13 tests)

Test Files  4 passed (4)
     Tests  50 passed (50)
```

### 2.2 Testes de Integração

```bash
# Todos os testes de integração
npm run test:integration

# Com variáveis de ambiente específicas
SUPABASE_TEST_URL=http://localhost:54321 npm run test:integration
```

**Pré-requisitos:**
- Banco de dados de teste rodando
- Variáveis de ambiente configuradas

### 2.3 Testes E2E

```bash
# Headless (padrão)
npm run test:e2e

# Com UI (modo visual)
npm run test:e2e:ui

# Debug mode (step by step)
npm run test:e2e:debug

# Browser específico
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

**Pré-requisitos:**
- Aplicação rodando (`npm run dev` em outro terminal)
- OU configurar `webServer` no playwright.config.ts (já configurado)

**Saída esperada:**
```
Running 3 tests using 1 worker

  ✓ example-login.spec.ts:4:5 › should display login page (1.2s)
  ✓ example-login.spec.ts:10:5 › should show error with invalid credentials (2.1s)
  - example-login.spec.ts:20:5 › should login successfully › SKIPPED

  3 passed (3.3s)
```

### 2.4 Todos os Testes

```bash
# Unit + Integration + E2E
npm run test:all
```

---

## 3. VARIÁVEIS DE AMBIENTE

### 3.1 Variáveis Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase | `https://abc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key do Supabase | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (para cleanup) | `eyJhbGc...` |

### 3.2 Variáveis Opcionais

| Variável | Descrição | Default |
|----------|-----------|---------|
| `SUPABASE_TEST_URL` | Override de URL para testes | Usa `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_TEST_ANON_KEY` | Override de anon key para testes | Usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `PLAYWRIGHT_TEST_BASE_URL` | URL base para E2E | `http://localhost:3000` |
| `CI` | Flag de CI (afeta retries) | `false` |

### 3.3 Exemplo Completo (.env.test.local)

```bash
# Supabase Local (desenvolvimento)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Playwright
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000

# Node
NODE_ENV=test
```

---

## 4. TROUBLESHOOTING

### 4.1 "Missing Supabase credentials"

**Erro:**
```
Error: Missing Supabase credentials. Set SUPABASE_TEST_URL and SUPABASE_TEST_ANON_KEY
```

**Solução:**
1. Verificar se `.env.test.local` existe
2. Verificar se variáveis estão corretas
3. Reiniciar terminal/IDE

### 4.2 "Cannot connect to database"

**Erro:**
```
SupabaseClient connection failed
```

**Solução:**
1. Se Supabase local: `supabase start`
2. Verificar se URL está correta (http vs https)
3. Verificar firewall/VPN

### 4.3 "Playwright browsers not found"

**Erro:**
```
browserType.launch: Executable doesn't exist
```

**Solução:**
```bash
npm run playwright:install
```

### 4.4 "Port 3000 already in use" (E2E)

**Erro:**
```
Error: Port 3000 is already in use
```

**Solução:**
1. Parar servidor dev (`npm run dev`)
2. OU configurar porta diferente:
   ```bash
   PLAYWRIGHT_TEST_BASE_URL=http://localhost:3001 npm run test:e2e
   ```

### 4.5 Testes Falhando Aleatoriamente (Flaky)

**Sintomas:**
- Testes passam às vezes, falham às vezes
- Timeouts intermitentes

**Solução:**
1. Aumentar timeouts no playwright.config.ts
2. Adicionar `waitFor` explícitos
3. Verificar limpeza de dados entre testes
4. Rodar com `--repeat-each=3` para detectar flakiness

### 4.6 Cobertura Abaixo do Threshold

**Erro:**
```
ERROR: Coverage for lines (58.5%) does not meet threshold (60%)
```

**Solução (temporária):**
1. Baixar threshold em `vitest.config.ts`:
   ```typescript
   thresholds: {
     lines: 55,  // Reduzir temporariamente
   }
   ```
2. OU adicionar mais testes para atingir 60%

---

## 5. CI/CD

### 5.1 GitHub Actions (Exemplo)

Arquivo: `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: supabase/postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test:integration
        env:
          SUPABASE_TEST_URL: ${{ secrets.SUPABASE_TEST_URL }}
          SUPABASE_TEST_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}
```

### 5.2 Secrets no GitHub

Configurar em: **Settings → Secrets → Actions**

- `SUPABASE_TEST_URL`
- `SUPABASE_TEST_ANON_KEY`
- `SUPABASE_TEST_SERVICE_KEY` (se necessário)

---

## 6. COMANDOS RÁPIDOS

```bash
# Setup inicial (uma vez)
npm install && npm run playwright:install

# Desenvolvimento (diário)
npm run test              # Watch mode
npm run test:unit         # Run once
npm run test:coverage     # Ver cobertura

# Pré-commit
npm run lint && npm run test:ci

# Pré-deploy
npm run test:all && npm run build

# Debug
npm run test:e2e:debug    # E2E step-by-step
npm run test -- --reporter=verbose  # Logs detalhados
```

---

## 7. ESTRUTURA DE PASTAS

```
tests/
├── unit/              # Testes unitários (lib/, services/)
├── integration/       # Testes de integração (API + DB)
├── e2e/               # Testes end-to-end (Playwright)
├── fixtures/
│   ├── factories/     # Factories de dados
│   ├── seeds/         # Seeds para E2E
│   └── mocks/         # Mocks de APIs externas
├── setup/             # Setup helpers (Supabase client)
└── utils/             # Utilitários (cleanup, etc.)
```

---

## 8. BOAS PRÁTICAS

### 8.1 Durante Desenvolvimento

✅ **DO:**
- Rodar `npm run test` em watch mode enquanto desenvolve
- Escrever teste ANTES de implementar funcionalidade (TDD)
- Verificar cobertura com `npm run test:coverage`
- Commitar testes junto com código

❌ **DON'T:**
- Commitar testes falhando
- Usar `test.skip` sem justificativa
- Usar `any` nos testes
- Fazer testes dependentes uns dos outros

### 8.2 Antes de Merge

```bash
# Checklist pré-merge
npm run lint           # ✓ Lint passou
npm run type-check     # ✓ Type check passou
npm run test:ci        # ✓ Testes passaram
npm run build          # ✓ Build passou
```

### 8.3 Manutenção

- **Semanal**: Revisar testes flaky (relatório no CI)
- **Mensal**: Revisar cobertura e adicionar testes faltantes
- **Trimestral**: Atualizar seeds e fixtures com dados realistas

---

## 9. MÉTRICAS ATUAIS

| Métrica | Atual | Meta | Status |
|---------|-------|------|--------|
| **Testes Unitários** | 57 | 205 | 🟡 28% |
| **Testes Integration** | 0 | 75 | 🔴 0% |
| **Testes E2E** | 2 | 15 | 🟡 13% |
| **Cobertura lib/** | ~80% | 100% | 🟡 80% |
| **Cobertura global** | ~15% | 60% | 🔴 25% |

---

## 10. SUPORTE

- **Documentação**: Ver `/tests-docs/` para planos detalhados
- **Issues**: Reportar em https://github.com/yonzeraaa/swiftlms/issues
- **Dúvidas**: Consultar PLANO_DE_TESTES.md e CATALOGO_DE_CASOS.md

---

**Última atualização:** 2025-11-08
**Mantido por:** Equipe SwiftLMS
