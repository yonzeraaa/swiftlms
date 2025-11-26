# 📋 CATÁLOGO DE CASOS DE TESTE - SwiftLMS

> **Versão:** 1.0.0
> **Data:** 2025-11-08
> **Baseado em:** CONTEXTO_DERIVADO_AUTOMATICAMENTE.md + PLANO_DE_TESTES.md

---

## 📚 ÍNDICE

- [1. VISÃO GERAL](#1-visão-geral)
- [2. CONVENÇÕES E NOMENCLATURA](#2-convenções-e-nomenclatura)
- [3. MATRIZ DE RASTREABILIDADE](#3-matriz-de-rastreabilidade)
- [4. CASOS DE TESTE UNITÁRIOS](#4-casos-de-teste-unitários)
- [5. CASOS DE TESTE DE INTEGRAÇÃO](#5-casos-de-teste-de-integração)
- [6. CASOS DE TESTE E2E](#6-casos-de-teste-e2e)
- [7. CASOS DE TESTE DE SEGURANÇA](#7-casos-de-teste-de-segurança)
- [8. CASOS DE TESTE DE PERFORMANCE](#8-casos-de-teste-de-performance)
- [9. CASOS DE SMOKE TEST](#9-casos-de-smoke-test)
- [10. MÉTRICAS E COBERTURA](#10-métricas-e-cobertura)

---

## 1. VISÃO GERAL

### 1.1 Propósito

Este catálogo mapeia **todos os casos de teste** da suite automatizada do SwiftLMS, garantindo:
- ✅ **Rastreabilidade**: requisito → caso de teste → implementação
- ✅ **Cobertura completa**: todos os fluxos críticos testados
- ✅ **Priorização clara**: P0 (crítico) → P1 (importante) → P2 (desejável)
- ✅ **Manutenibilidade**: evolução controlada dos testes

### 1.2 Estatísticas Projetadas

| Tipo | Quantidade | % Suite | Prioridade P0 | Prioridade P1 | Prioridade P2 |
|------|-----------|---------|---------------|---------------|---------------|
| **Unit** | 205 | 68% | 75 | 90 | 40 |
| **Integration** | 75 | 25% | 35 | 30 | 10 |
| **E2E** | 15 | 5% | 9 | 5 | 1 |
| **Security** | 12 | 4% | 12 | 0 | 0 |
| **Performance** | 5 | 2% | 5 | 0 | 0 |
| **Smoke** | 3 | 1% | 3 | 0 | 0 |
| **TOTAL** | **315** | **100%** | **139** | **125** | **51** |

---

## 2. CONVENÇÕES E NOMENCLATURA

### 2.1 ID dos Casos

Formato: `[TIPO]-[MÓDULO]-[NÚMERO]`

**Exemplos:**
- `UNIT-AUTH-001`: Teste unitário do módulo de autenticação #1
- `INT-API-015`: Teste de integração da API #15
- `E2E-ENROLL-003`: Teste E2E de enrollment #3
- `SEC-RLS-008`: Teste de segurança de RLS #8

### 2.2 Prioridades

| Prioridade | Critério | Impacto se falhar |
|-----------|----------|-------------------|
| **P0** 🔴 | Quebra impede uso do sistema | Sistema inutilizável ou inseguro |
| **P1** 🟡 | Quebra afeta funcionalidade importante | Funcionalidade core comprometida |
| **P2** 🟢 | Quebra afeta UX, não funcionalidade | Experiência degradada |

### 2.3 Status de Implementação

- ⚫ **Not Started**: Não iniciado
- 🔵 **In Progress**: Em desenvolvimento
- 🟢 **Implemented**: Implementado e passando
- 🔴 **Failing**: Implementado mas falhando
- ⚪ **Skipped**: Pulado (justificar)

### 2.4 Tipos de Teste

| Tipo | Escopo | Ferramentas | Ambiente |
|------|--------|-------------|----------|
| **UNIT** | Funções puras, utils, validadores | Vitest + Testing Library | Isolado (sem DB) |
| **INT** | API routes + DB + Auth + Storage | Vitest + Supabase local | DB de teste |
| **E2E** | Fluxo completo usuário → UI → back | Playwright | App rodando + DB |
| **SEC** | RLS, auth, injection, OWASP | Vitest + SQL scripts | DB de teste |
| **PERF** | Latência, throughput, orçamentos | Vitest + benchmarks | DB com carga |
| **SMOKE** | Health checks pós-deploy | Playwright ou curl | Produção/Staging |

---

## 3. MATRIZ DE RASTREABILIDADE

### 3.1 Requisitos Funcionais → Casos de Teste

| ID Req | Requisito | Prioridade | Casos de Teste |
|--------|-----------|-----------|----------------|
| **RF-001** | Autenticação de usuários (SSO Supabase) | P0 | UNIT-AUTH-001~010, INT-AUTH-001~008, E2E-AUTH-001~002, SEC-AUTH-001~003 |
| **RF-002** | Autorização por roles (student/teacher/admin) | P0 | SEC-RLS-001~012, INT-AUTH-009~012 |
| **RF-003** | Matrícula em cursos | P0 | INT-ENROLL-001~005, E2E-ENROLL-001~002 |
| **RF-004** | Visualização de conteúdo (courses/modules/lessons) | P0 | INT-CONTENT-001~008, E2E-CONTENT-001 |
| **RF-005** | Realização de testes/assignments | P0 | INT-TESTS-001~012, E2E-TESTS-001~003 |
| **RF-006** | Cálculo e exibição de notas | P0 | UNIT-GRADES-001~010, INT-GRADES-001~005, E2E-GRADES-001 |
| **RF-007** | Importação Google Drive | P1 | INT-GDRIVE-001~008, E2E-GDRIVE-001 |
| **RF-008** | Geração de certificados | P1 | INT-CERT-001~005, E2E-CERT-001 |
| **RF-009** | Submissão de TCC | P1 | INT-TCC-001~004, E2E-TCC-001 |
| **RF-010** | Relatórios Excel/PDF | P1 | INT-REPORTS-001~006 |
| **RF-011** | View as Student (admin) | P1 | E2E-ADMIN-001 |
| **RF-012** | Dashboard do estudante | P1 | E2E-DASHBOARD-001 |
| **RF-013** | Upload/download de arquivos | P1 | INT-STORAGE-001~004 |
| **RF-014** | Busca e filtros | P2 | INT-SEARCH-001~003 |
| **RF-015** | Notificações | P2 | INT-NOTIF-001~002 |

### 3.2 Requisitos Não-Funcionais → Casos de Teste

| ID Req | Requisito | Prioridade | Casos de Teste |
|--------|-----------|-----------|----------------|
| **RNF-001** | RLS policies aplicadas em todas as tabelas | P0 | SEC-RLS-001~012 |
| **RNF-002** | APIs respondem em <200ms (p50), <1s (p95) | P0 | PERF-API-001~003 |
| **RNF-003** | Transações garantem consistência de dados | P0 | INT-TX-001~005 |
| **RNF-004** | Proteção contra SQL Injection | P0 | SEC-OWASP-001 |
| **RNF-005** | Proteção contra XSS | P0 | SEC-OWASP-002 |
| **RNF-006** | CSRF tokens em mutações | P0 | SEC-OWASP-003 |
| **RNF-007** | Acessibilidade WCAG 2.2 AA | P1 | E2E-A11Y-001~003 |
| **RNF-008** | Suporte a navegadores modernos (Chrome, Firefox) | P1 | E2E-BROWSER-001~002 |
| **RNF-009** | Responsividade (mobile, tablet, desktop) | P2 | E2E-RESPONSIVE-001 |

---

## 4. CASOS DE TESTE UNITÁRIOS

> **Total:** 205 casos
> **Escopo:** Funções puras, utils, validadores, formatadores
> **Ferramentas:** Vitest + Testing Library
> **Ambiente:** Isolado (sem DB)

### 4.1 AUTH - Autenticação (10 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-AUTH-001 | `hashPassword()` gera hash bcrypt válido | P0 | ⚫ | `lib/auth/crypto.test.ts` | bcrypt |
| UNIT-AUTH-002 | `verifyPassword()` valida senha correta | P0 | ⚫ | `lib/auth/crypto.test.ts` | bcrypt |
| UNIT-AUTH-003 | `verifyPassword()` rejeita senha incorreta | P0 | ⚫ | `lib/auth/crypto.test.ts` | - |
| UNIT-AUTH-004 | `generateToken()` cria JWT válido | P0 | ⚫ | `lib/auth/jwt.test.ts` | jose |
| UNIT-AUTH-005 | `verifyToken()` valida JWT válido | P0 | ⚫ | `lib/auth/jwt.test.ts` | jose |
| UNIT-AUTH-006 | `verifyToken()` rejeita JWT expirado | P0 | ⚫ | `lib/auth/jwt.test.ts` | vi.useFakeTimers |
| UNIT-AUTH-007 | `verifyToken()` rejeita JWT com assinatura inválida | P0 | ⚫ | `lib/auth/jwt.test.ts` | - |
| UNIT-AUTH-008 | `parseAuthHeader()` extrai Bearer token | P1 | ⚫ | `lib/auth/headers.test.ts` | - |
| UNIT-AUTH-009 | `parseAuthHeader()` retorna null se sem token | P1 | ⚫ | `lib/auth/headers.test.ts` | - |
| UNIT-AUTH-010 | `sanitizeEmail()` normaliza emails | P2 | ⚫ | `lib/auth/validators.test.ts` | - |

**Cobertura Esperada:** 100% de lib/auth/

### 4.2 GRADES - Cálculo de Notas (10 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-GRADES-001 | `calculateTestGrade()` retorna nota correta (10 de 10) | P0 | ⚫ | `lib/grades/calculator.test.ts` | - |
| UNIT-GRADES-002 | `calculateTestGrade()` retorna nota parcial (7 de 10) | P0 | ⚫ | `lib/grades/calculator.test.ts` | - |
| UNIT-GRADES-003 | `calculateTestGrade()` retorna 0 (0 de 10) | P0 | ⚫ | `lib/grades/calculator.test.ts` | - |
| UNIT-GRADES-004 | `calculateModuleGrade()` usa ponderação correta | P0 | ⚫ | `lib/grades/calculator.test.ts` | - |
| UNIT-GRADES-005 | `calculateCourseGrade()` agrega notas de módulos | P0 | ⚫ | `lib/grades/calculator.test.ts` | - |
| UNIT-GRADES-006 | `isApproved()` retorna true se nota >= 7.0 | P0 | ⚫ | `lib/grades/approval.test.ts` | - |
| UNIT-GRADES-007 | `isApproved()` retorna false se nota < 7.0 | P0 | ⚫ | `lib/grades/approval.test.ts` | - |
| UNIT-GRADES-008 | `formatGrade()` formata 10.0 como "10,0" | P1 | ⚫ | `lib/grades/formatters.test.ts` | - |
| UNIT-GRADES-009 | `formatGrade()` formata 7.5 como "7,5" | P1 | ⚫ | `lib/grades/formatters.test.ts` | - |
| UNIT-GRADES-010 | `parseGrade()` converte "8,5" para 8.5 | P1 | ⚫ | `lib/grades/formatters.test.ts` | - |

**Cobertura Esperada:** 100% de lib/grades/

### 4.3 VALIDATORS - Validadores (15 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-VAL-001 | `validateEmail()` aceita email válido | P0 | ⚫ | `lib/validators/email.test.ts` | - |
| UNIT-VAL-002 | `validateEmail()` rejeita email sem @ | P0 | ⚫ | `lib/validators/email.test.ts` | - |
| UNIT-VAL-003 | `validateEmail()` rejeita email sem domínio | P0 | ⚫ | `lib/validators/email.test.ts` | - |
| UNIT-VAL-004 | `validateCPF()` aceita CPF válido (com máscara) | P1 | ⚫ | `lib/validators/cpf.test.ts` | - |
| UNIT-VAL-005 | `validateCPF()` rejeita CPF inválido | P1 | ⚫ | `lib/validators/cpf.test.ts` | - |
| UNIT-VAL-006 | `validateCPF()` rejeita CPF com dígito verificador errado | P1 | ⚫ | `lib/validators/cpf.test.ts` | - |
| UNIT-VAL-007 | `validatePassword()` aceita senha forte (8+ chars, maiúsc, minúsc, num) | P0 | ⚫ | `lib/validators/password.test.ts` | - |
| UNIT-VAL-008 | `validatePassword()` rejeita senha curta (<8 chars) | P0 | ⚫ | `lib/validators/password.test.ts` | - |
| UNIT-VAL-009 | `validatePassword()` rejeita senha sem número | P0 | ⚫ | `lib/validators/password.test.ts` | - |
| UNIT-VAL-010 | `validateDate()` aceita data válida (ISO8601) | P1 | ⚫ | `lib/validators/date.test.ts` | - |
| UNIT-VAL-011 | `validateDate()` rejeita data inválida | P1 | ⚫ | `lib/validators/date.test.ts` | - |
| UNIT-VAL-012 | `validateUUID()` aceita UUID v4 válido | P1 | ⚫ | `lib/validators/uuid.test.ts` | - |
| UNIT-VAL-013 | `validateUUID()` rejeita string não-UUID | P1 | ⚫ | `lib/validators/uuid.test.ts` | - |
| UNIT-VAL-014 | `validateSlug()` aceita slug válido (kebab-case) | P2 | ⚫ | `lib/validators/slug.test.ts` | - |
| UNIT-VAL-015 | `sanitizeHTML()` remove tags perigosas (<script>) | P0 | ⚫ | `lib/validators/sanitize.test.ts` | DOMPurify |

**Cobertura Esperada:** 100% de lib/validators/

### 4.4 FORMATTERS - Formatadores (10 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-FMT-001 | `formatCurrency()` formata 1000 como "R$ 1.000,00" | P1 | ⚫ | `lib/formatters/currency.test.ts` | - |
| UNIT-FMT-002 | `formatCurrency()` formata 0.5 como "R$ 0,50" | P1 | ⚫ | `lib/formatters/currency.test.ts` | - |
| UNIT-FMT-003 | `formatDate()` formata ISO para "dd/mm/yyyy" | P1 | ⚫ | `lib/formatters/date.test.ts` | date-fns |
| UNIT-FMT-004 | `formatDateTime()` inclui hora "dd/mm/yyyy HH:mm" | P1 | ⚫ | `lib/formatters/date.test.ts` | date-fns |
| UNIT-FMT-005 | `formatRelativeTime()` retorna "há 2 horas" | P2 | ⚫ | `lib/formatters/date.test.ts` | date-fns |
| UNIT-FMT-006 | `truncateText()` limita texto a N caracteres | P2 | ⚫ | `lib/formatters/text.test.ts` | - |
| UNIT-FMT-007 | `slugify()` converte "Aula 1: Introdução" para "aula-1-introducao" | P1 | ⚫ | `lib/formatters/slug.test.ts` | - |
| UNIT-FMT-008 | `formatFileSize()` formata 1024 como "1 KB" | P2 | ⚫ | `lib/formatters/file.test.ts` | - |
| UNIT-FMT-009 | `formatDuration()` formata 3665 segundos como "1h 1m 5s" | P2 | ⚫ | `lib/formatters/time.test.ts` | - |
| UNIT-FMT-010 | `formatPhone()` formata "(11) 98765-4321" | P2 | ⚫ | `lib/formatters/phone.test.ts` | - |

**Cobertura Esperada:** 100% de lib/formatters/

### 4.5 PARSERS - Parsers (10 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-PARSE-001 | `parseCSV()` converte CSV para array de objetos | P1 | ⚫ | `lib/parsers/csv.test.ts` | PapaParse |
| UNIT-PARSE-002 | `parseCSV()` trata erros de encoding | P1 | ⚫ | `lib/parsers/csv.test.ts` | - |
| UNIT-PARSE-003 | `parseJSON()` valida e parseia JSON válido | P1 | ⚫ | `lib/parsers/json.test.ts` | - |
| UNIT-PARSE-004 | `parseJSON()` retorna erro em JSON inválido | P1 | ⚫ | `lib/parsers/json.test.ts` | - |
| UNIT-PARSE-005 | `parseMarkdown()` converte MD para HTML | P1 | ⚫ | `lib/parsers/markdown.test.ts` | marked |
| UNIT-PARSE-006 | `parseMarkdown()` sanitiza output (XSS) | P0 | ⚫ | `lib/parsers/markdown.test.ts` | DOMPurify |
| UNIT-PARSE-007 | `parseExcel()` extrai dados de .xlsx | P1 | ⚫ | `lib/parsers/excel.test.ts` | exceljs |
| UNIT-PARSE-008 | `parseExcel()` trata planilhas vazias | P1 | ⚫ | `lib/parsers/excel.test.ts` | - |
| UNIT-PARSE-009 | `parseURL()` extrai query params corretamente | P2 | ⚫ | `lib/parsers/url.test.ts` | - |
| UNIT-PARSE-010 | `parseUserAgent()` detecta navegador e OS | P2 | ⚫ | `lib/parsers/ua.test.ts` | ua-parser-js |

**Cobertura Esperada:** 100% de lib/parsers/

### 4.6 UTILS - Utilitários (20 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-UTIL-001 | `arrayToMap()` converte array para map por key | P1 | ⚫ | `lib/utils/array.test.ts` | - |
| UNIT-UTIL-002 | `groupBy()` agrupa array por propriedade | P1 | ⚫ | `lib/utils/array.test.ts` | - |
| UNIT-UTIL-003 | `unique()` remove duplicatas de array | P1 | ⚫ | `lib/utils/array.test.ts` | - |
| UNIT-UTIL-004 | `chunk()` divide array em pedaços | P2 | ⚫ | `lib/utils/array.test.ts` | - |
| UNIT-UTIL-005 | `debounce()` limita execuções por tempo | P1 | ⚫ | `lib/utils/function.test.ts` | vi.useFakeTimers |
| UNIT-UTIL-006 | `throttle()` limita execuções por intervalo | P1 | ⚫ | `lib/utils/function.test.ts` | vi.useFakeTimers |
| UNIT-UTIL-007 | `retry()` reexecuta função em caso de erro | P1 | ⚫ | `lib/utils/function.test.ts` | - |
| UNIT-UTIL-008 | `retry()` desiste após N tentativas | P1 | ⚫ | `lib/utils/function.test.ts` | - |
| UNIT-UTIL-009 | `deepClone()` clona objetos aninhados | P1 | ⚫ | `lib/utils/object.test.ts` | - |
| UNIT-UTIL-010 | `deepMerge()` mescla objetos aninhados | P1 | ⚫ | `lib/utils/object.test.ts` | - |
| UNIT-UTIL-011 | `pick()` extrai propriedades de objeto | P2 | ⚫ | `lib/utils/object.test.ts` | - |
| UNIT-UTIL-012 | `omit()` remove propriedades de objeto | P2 | ⚫ | `lib/utils/object.test.ts` | - |
| UNIT-UTIL-013 | `sleep()` aguarda N milissegundos | P2 | ⚫ | `lib/utils/async.test.ts` | vi.useFakeTimers |
| UNIT-UTIL-014 | `promiseAllSettled()` aguarda todas promises | P1 | ⚫ | `lib/utils/async.test.ts` | - |
| UNIT-UTIL-015 | `isValidJSON()` valida string JSON | P1 | ⚫ | `lib/utils/string.test.ts` | - |
| UNIT-UTIL-016 | `capitalize()` capitaliza primeira letra | P2 | ⚫ | `lib/utils/string.test.ts` | - |
| UNIT-UTIL-017 | `camelCase()` converte para camelCase | P2 | ⚫ | `lib/utils/string.test.ts` | - |
| UNIT-UTIL-018 | `snakeCase()` converte para snake_case | P2 | ⚫ | `lib/utils/string.test.ts` | - |
| UNIT-UTIL-019 | `randomString()` gera string aleatória | P2 | ⚫ | `lib/utils/random.test.ts` | - |
| UNIT-UTIL-020 | `randomInt()` gera inteiro entre min-max | P2 | ⚫ | `lib/utils/random.test.ts` | - |

**Cobertura Esperada:** 90% de lib/utils/

### 4.7 SERVICES - Serviços (Business Logic) (60 casos)

Divididos em sub-módulos:

#### 4.7.1 StudentHistoryService (10 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-SVC-HIST-001 | `mapEnrollmentData()` agrupa notas por módulo | P0 | ⚫ | `services/StudentHistoryService.test.ts` | - |
| UNIT-SVC-HIST-002 | `calculateCompletionPercentage()` retorna % correto | P0 | ⚫ | `services/StudentHistoryService.test.ts` | - |
| UNIT-SVC-HIST-003 | `formatHistoryData()` estrutura dados para relatório | P1 | ⚫ | `services/StudentHistoryService.test.ts` | - |
| UNIT-SVC-HIST-004 | Trata estudante sem enrollments | P1 | ⚫ | `services/StudentHistoryService.test.ts` | - |
| UNIT-SVC-HIST-005 | Trata estudante com enrollment sem notas | P1 | ⚫ | `services/StudentHistoryService.test.ts` | - |
| UNIT-SVC-HIST-006 | Trata múltiplos enrollments (mesmo curso) - usa mais recente | P0 | 🟢 | `services/StudentHistoryService.test.ts` | Evidência: src/__tests__/services/StudentHistoryService.test.ts |
| UNIT-SVC-HIST-007 | `getModulesByEnrollment()` retorna módulos em ordem | P1 | ⚫ | `services/StudentHistoryService.test.ts` | - |
| UNIT-SVC-HIST-008 | `getCourseCompletionStatus()` retorna "completed" se 100% | P1 | ⚫ | `services/StudentHistoryService.test.ts` | - |
| UNIT-SVC-HIST-009 | `getCourseCompletionStatus()` retorna "in_progress" se <100% | P1 | ⚫ | `services/StudentHistoryService.test.ts` | - |
| UNIT-SVC-HIST-010 | `getCourseCompletionStatus()` retorna "not_started" se 0% | P1 | ⚫ | `services/StudentHistoryService.test.ts` | - |

#### 4.7.2 TestGradingService (12 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-SVC-GRADE-001 | `gradeTest()` calcula nota corretamente (múltipla escolha) | P0 | ⚫ | `services/TestGradingService.test.ts` | - |
| UNIT-SVC-GRADE-002 | `gradeTest()` calcula nota corretamente (verdadeiro/falso) | P0 | ⚫ | `services/TestGradingService.test.ts` | - |
| UNIT-SVC-GRADE-003 | `gradeTest()` calcula nota corretamente (múltipla escolha + V/F) | P0 | ⚫ | `services/TestGradingService.test.ts` | - |
| UNIT-SVC-GRADE-004 | `gradeTest()` retorna 0 se todas erradas | P0 | ⚫ | `services/TestGradingService.test.ts` | - |
| UNIT-SVC-GRADE-005 | `gradeTest()` retorna 10 se todas certas | P0 | ⚫ | `services/TestGradingService.test.ts` | - |
| UNIT-SVC-GRADE-006 | `gradeTest()` trata questões sem resposta (não penaliza) | P0 | ⚫ | `services/TestGradingService.test.ts` | - |
| UNIT-SVC-GRADE-007 | `validateAnswers()` rejeita respostas inválidas (question_id não existe) | P0 | ⚫ | `services/TestGradingService.test.ts` | - |
| UNIT-SVC-GRADE-008 | `validateAnswers()` rejeita respostas duplicadas (mesma questão 2x) | P0 | ⚫ | `services/TestGradingService.test.ts` | - |
| UNIT-SVC-GRADE-009 | `calculatePassingStatus()` retorna true se nota >= 7.0 | P0 | ⚫ | `services/TestGradingService.test.ts` | - |
| UNIT-SVC-GRADE-010 | `calculatePassingStatus()` retorna false se nota < 7.0 | P0 | ⚫ | `services/TestGradingService.test.ts` | - |
| UNIT-SVC-GRADE-011 | `getFeedbackMessage()` retorna mensagem apropriada (aprovado) | P1 | ⚫ | `services/TestGradingService.test.ts` | - |
| UNIT-SVC-GRADE-012 | `getFeedbackMessage()` retorna mensagem apropriada (reprovado) | P1 | ⚫ | `services/TestGradingService.test.ts` | - |

#### 4.7.3 CertificateService (8 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-SVC-CERT-001 | `canRequestCertificate()` retorna true se 100% concluído + aprovado | P0 | ⚫ | `services/CertificateService.test.ts` | - |
| UNIT-SVC-CERT-002 | `canRequestCertificate()` retorna false se <100% concluído | P0 | ⚫ | `services/CertificateService.test.ts` | - |
| UNIT-SVC-CERT-003 | `canRequestCertificate()` retorna false se reprovado | P0 | ⚫ | `services/CertificateService.test.ts` | - |
| UNIT-SVC-CERT-004 | `generateCertificateData()` formata dados corretamente | P1 | ⚫ | `services/CertificateService.test.ts` | - |
| UNIT-SVC-CERT-005 | `formatCourseHours()` converte minutos para horas | P1 | ⚫ | `services/CertificateService.test.ts` | - |
| UNIT-SVC-CERT-006 | `getCertificateStatus()` retorna "approved" se já aprovado | P1 | ⚫ | `services/CertificateService.test.ts` | - |
| UNIT-SVC-CERT-007 | `getCertificateStatus()` retorna "pending" se aguardando | P1 | ⚫ | `services/CertificateService.test.ts` | - |
| UNIT-SVC-CERT-008 | `getCertificateStatus()` retorna "rejected" se rejeitado | P1 | ⚫ | `services/CertificateService.test.ts` | - |

#### 4.7.4 EnrollmentService (10 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-SVC-ENROLL-001 | `canEnroll()` retorna true se estudante elegível | P0 | ⚫ | `services/EnrollmentService.test.ts` | - |
| UNIT-SVC-ENROLL-002 | `canEnroll()` retorna false se já matriculado | P0 | ⚫ | `services/EnrollmentService.test.ts` | - |
| UNIT-SVC-ENROLL-003 | `canEnroll()` retorna false se curso inativo | P0 | ⚫ | `services/EnrollmentService.test.ts` | - |
| UNIT-SVC-ENROLL-004 | `calculateProgress()` retorna % correto (módulos concluídos) | P0 | ⚫ | `services/EnrollmentService.test.ts` | - |
| UNIT-SVC-ENROLL-005 | `calculateProgress()` retorna 0% se nenhum módulo concluído | P0 | ⚫ | `services/EnrollmentService.test.ts` | - |
| UNIT-SVC-ENROLL-006 | `calculateProgress()` retorna 100% se todos módulos concluídos | P0 | ⚫ | `services/EnrollmentService.test.ts` | - |
| UNIT-SVC-ENROLL-007 | `getEnrollmentStatus()` retorna "active" se em andamento | P1 | ⚫ | `services/EnrollmentService.test.ts` | - |
| UNIT-SVC-ENROLL-008 | `getEnrollmentStatus()` retorna "completed" se 100% + aprovado | P1 | ⚫ | `services/EnrollmentService.test.ts` | - |
| UNIT-SVC-ENROLL-009 | `getEnrollmentStatus()` retorna "failed" se reprovado | P1 | ⚫ | `services/EnrollmentService.test.ts` | - |
| UNIT-SVC-ENROLL-010 | `getNextModuleToComplete()` retorna próximo módulo não feito | P1 | ⚫ | `services/EnrollmentService.test.ts` | - |

#### 4.7.5 GoogleDriveService (10 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-SVC-GDRIVE-001 | `parseGDriveURL()` extrai file/folder ID de URL | P1 | ⚫ | `services/GoogleDriveService.test.ts` | - |
| UNIT-SVC-GDRIVE-002 | `parseGDriveURL()` retorna null em URL inválida | P1 | ⚫ | `services/GoogleDriveService.test.ts` | - |
| UNIT-SVC-GDRIVE-003 | `isGDriveFolder()` detecta folder vs file | P1 | ⚫ | `services/GoogleDriveService.test.ts` | - |
| UNIT-SVC-GDRIVE-004 | `sanitizeFileName()` remove caracteres perigosos | P0 | ⚫ | `services/GoogleDriveService.test.ts` | - |
| UNIT-SVC-GDRIVE-005 | `getMimeTypeCategory()` categoriza mimeType corretamente | P1 | ⚫ | `services/GoogleDriveService.test.ts` | - |
| UNIT-SVC-GDRIVE-006 | `formatFileSize()` formata bytes para KB/MB/GB | P2 | ⚫ | `services/GoogleDriveService.test.ts` | - |
| UNIT-SVC-GDRIVE-007 | `shouldSkipFile()` pula arquivos de sistema (.DS_Store) | P1 | ⚫ | `services/GoogleDriveService.test.ts` | - |
| UNIT-SVC-GDRIVE-008 | `validateAccessToken()` verifica formato JWT válido | P1 | ⚫ | `services/GoogleDriveService.test.ts` | - |
| UNIT-SVC-GDRIVE-009 | `buildImportMetadata()` estrutura metadados corretamente | P1 | ⚫ | `services/GoogleDriveService.test.ts` | - |
| UNIT-SVC-GDRIVE-010 | `estimateImportTime()` estima tempo baseado em tamanho | P2 | ⚫ | `services/GoogleDriveService.test.ts` | - |

#### 4.7.6 ReportService (10 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-SVC-RPT-001 | `formatStudentHistoryForExcel()` estrutura dados corretamente | P1 | ⚫ | `services/ReportService.test.ts` | - |
| UNIT-SVC-RPT-002 | `formatStudentHistoryForPDF()` estrutura dados corretamente | P1 | ⚫ | `services/ReportService.test.ts` | - |
| UNIT-SVC-RPT-003 | `generateExcelHeader()` cria headers corretos | P1 | ⚫ | `services/ReportService.test.ts` | - |
| UNIT-SVC-RPT-004 | `calculateReportStats()` calcula média, min, max | P1 | ⚫ | `services/ReportService.test.ts` | - |
| UNIT-SVC-RPT-005 | `formatGradeForReport()` formata nota com 2 casas decimais | P1 | ⚫ | `services/ReportService.test.ts` | - |
| UNIT-SVC-RPT-006 | `groupByModule()` agrupa notas por módulo | P1 | ⚫ | `services/ReportService.test.ts` | - |
| UNIT-SVC-RPT-007 | `getReportFileName()` gera nome único com timestamp | P2 | ⚫ | `services/ReportService.test.ts` | - |
| UNIT-SVC-RPT-008 | `validateReportData()` valida dados antes de gerar | P1 | ⚫ | `services/ReportService.test.ts` | - |
| UNIT-SVC-RPT-009 | `sanitizeDataForExport()` remove dados sensíveis | P0 | ⚫ | `services/ReportService.test.ts` | - |
| UNIT-SVC-RPT-010 | `getReportTemplate()` retorna template correto por tipo | P1 | ⚫ | `services/ReportService.test.ts` | - |

### 4.8 COMPONENTS - Componentes React (70 casos)

Focando nos 10 componentes mais críticos:

#### 4.8.1 TestTaking (10 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-CMP-TEST-001 | Renderiza questões corretamente | P0 | ⚫ | `components/TestTaking.test.tsx` | @testing-library/react |
| UNIT-CMP-TEST-002 | Permite seleção de resposta | P0 | ⚫ | `components/TestTaking.test.tsx` | - |
| UNIT-CMP-TEST-003 | Desabilita submit se nenhuma resposta selecionada | P0 | ⚫ | `components/TestTaking.test.tsx` | - |
| UNIT-CMP-TEST-004 | Mostra contador de questões (1 de 10) | P1 | ⚫ | `components/TestTaking.test.tsx` | - |
| UNIT-CMP-TEST-005 | Mostra timer se teste temporizado | P1 | ⚫ | `components/TestTaking.test.tsx` | vi.useFakeTimers |
| UNIT-CMP-TEST-006 | Navega entre questões (próximo/anterior) | P1 | ⚫ | `components/TestTaking.test.tsx` | - |
| UNIT-CMP-TEST-007 | Marca questão como revisão | P2 | ⚫ | `components/TestTaking.test.tsx` | - |
| UNIT-CMP-TEST-008 | Mostra confirmação antes de submeter | P0 | ⚫ | `components/TestTaking.test.tsx` | - |
| UNIT-CMP-TEST-009 | Exibe feedback após submissão | P0 | ⚫ | `components/TestTaking.test.tsx` | - |
| UNIT-CMP-TEST-010 | Trata erros de submit (mostra toast) | P0 | ⚫ | `components/TestTaking.test.tsx` | - |

#### 4.8.2 CourseCard (7 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-CMP-CARD-001 | Renderiza título e descrição | P0 | ⚫ | `components/CourseCard.test.tsx` | - |
| UNIT-CMP-CARD-002 | Mostra progresso se enrolled | P0 | ⚫ | `components/CourseCard.test.tsx` | - |
| UNIT-CMP-CARD-003 | Mostra botão "Matricular" se não enrolled | P0 | ⚫ | `components/CourseCard.test.tsx` | - |
| UNIT-CMP-CARD-004 | Mostra badge "Concluído" se 100% | P1 | ⚫ | `components/CourseCard.test.tsx` | - |
| UNIT-CMP-CARD-005 | Mostra thumbnail placeholder se sem imagem | P2 | ⚫ | `components/CourseCard.test.tsx` | - |
| UNIT-CMP-CARD-006 | Click navega para página do curso | P0 | ⚫ | `components/CourseCard.test.tsx` | - |
| UNIT-CMP-CARD-007 | Acessível via teclado (Tab + Enter) | P1 | ⚫ | `components/CourseCard.test.tsx` | - |

#### 4.8.3 GradeDisplay (6 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-CMP-GRADE-001 | Renderiza nota formatada (8,5) | P0 | ⚫ | `components/GradeDisplay.test.tsx` | - |
| UNIT-CMP-GRADE-002 | Mostra cor verde se aprovado (>= 7.0) | P0 | ⚫ | `components/GradeDisplay.test.tsx` | - |
| UNIT-CMP-GRADE-003 | Mostra cor vermelha se reprovado (< 7.0) | P0 | ⚫ | `components/GradeDisplay.test.tsx` | - |
| UNIT-CMP-GRADE-004 | Mostra "-" se sem nota | P1 | ⚫ | `components/GradeDisplay.test.tsx` | - |
| UNIT-CMP-GRADE-005 | Mostra tooltip com detalhes (hover) | P2 | ⚫ | `components/GradeDisplay.test.tsx` | - |
| UNIT-CMP-GRADE-006 | Acessível (aria-label com status) | P1 | ⚫ | `components/GradeDisplay.test.tsx` | - |

#### 4.8.4 FileUploader (10 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Dependências |
|----|-----------|-----------|--------|---------|--------------|
| UNIT-CMP-UPLOAD-001 | Renderiza área de drop | P0 | ⚫ | `components/FileUploader.test.tsx` | - |
| UNIT-CMP-UPLOAD-002 | Aceita arquivos por click | P0 | ⚫ | `components/FileUploader.test.tsx` | - |
| UNIT-CMP-UPLOAD-003 | Aceita arquivos por drag & drop | P0 | ⚫ | `components/FileUploader.test.tsx` | - |
| UNIT-CMP-UPLOAD-004 | Valida tipo de arquivo (aceita apenas permitidos) | P0 | ⚫ | `components/FileUploader.test.tsx` | - |
| UNIT-CMP-UPLOAD-005 | Valida tamanho máximo (rejeita >10MB) | P0 | ⚫ | `components/FileUploader.test.tsx` | - |
| UNIT-CMP-UPLOAD-006 | Mostra preview de imagem | P1 | ⚫ | `components/FileUploader.test.tsx` | - |
| UNIT-CMP-UPLOAD-007 | Mostra lista de arquivos selecionados | P1 | ⚫ | `components/FileUploader.test.tsx` | - |
| UNIT-CMP-UPLOAD-008 | Permite remover arquivo da lista | P1 | ⚫ | `components/FileUploader.test.tsx` | - |
| UNIT-CMP-UPLOAD-009 | Mostra progress bar durante upload | P1 | ⚫ | `components/FileUploader.test.tsx` | - |
| UNIT-CMP-UPLOAD-010 | Mostra erro se upload falhar | P0 | ⚫ | `components/FileUploader.test.tsx` | - |

#### 4.8.5 Outros Componentes Críticos (37 casos distribuídos)

- StudentDashboard (8 casos)
- ModuleList (6 casos)
- LessonViewer (8 casos)
- CertificateRequest (7 casos)
- AdminGradeEntry (8 casos)

---

## 5. CASOS DE TESTE DE INTEGRAÇÃO

> **Total:** 75 casos
> **Escopo:** API routes + DB + Auth + Storage
> **Ferramentas:** Vitest + Supabase local
> **Ambiente:** DB de teste (transações/schema temporário)

### 5.1 AUTH - Autenticação e Autorização (12 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-AUTH-001 | POST /api/auth/login retorna 200 + token com credenciais válidas | P0 | ⚫ | `tests/integration/api/auth/login.test.ts` | - |
| INT-AUTH-002 | POST /api/auth/login retorna 401 com senha incorreta | P0 | ⚫ | `tests/integration/api/auth/login.test.ts` | - |
| INT-AUTH-003 | POST /api/auth/login retorna 404 com email não cadastrado | P0 | ⚫ | `tests/integration/api/auth/login.test.ts` | - |
| INT-AUTH-004 | POST /api/auth/logout invalida token | P0 | ⚫ | `tests/integration/api/auth/logout.test.ts` | - |
| INT-AUTH-005 | GET /api/auth/me retorna dados do usuário autenticado | P0 | ⚫ | `tests/integration/api/auth/me.test.ts` | - |
| INT-AUTH-006 | GET /api/auth/me retorna 401 sem token | P0 | ⚫ | `tests/integration/api/auth/me.test.ts` | - |
| INT-AUTH-007 | GET /api/auth/me retorna 401 com token expirado | P0 | ⚫ | `tests/integration/api/auth/me.test.ts` | - |
| INT-AUTH-008 | POST /api/auth/refresh renova token válido | P1 | ⚫ | `tests/integration/api/auth/refresh.test.ts` | - |
| INT-AUTH-009 | Middleware de autorização bloqueia student acessando rota admin | P0 | ⚫ | `tests/integration/api/middleware/auth.test.ts` | - |
| INT-AUTH-010 | Middleware de autorização permite teacher acessando rota teacher | P0 | ⚫ | `tests/integration/api/middleware/auth.test.ts` | - |
| INT-AUTH-011 | Middleware de autorização permite admin acessando qualquer rota | P0 | ⚫ | `tests/integration/api/middleware/auth.test.ts` | - |
| INT-AUTH-012 | Rate limiting bloqueia após 10 tentativas de login em 1 minuto | P1 | ⚫ | `tests/integration/api/auth/rate-limit.test.ts` | - |

### 5.2 ENROLLMENTS - Matrículas (5 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-ENROLL-001 | POST /api/enrollments cria matrícula com sucesso | P0 | ⚫ | `tests/integration/api/enrollments/create.test.ts` | - |
| INT-ENROLL-002 | POST /api/enrollments retorna 409 se já matriculado | P0 | ⚫ | `tests/integration/api/enrollments/create.test.ts` | - |
| INT-ENROLL-003 | GET /api/enrollments retorna lista de matrículas do estudante | P0 | ⚫ | `tests/integration/api/enrollments/list.test.ts` | - |
| INT-ENROLL-004 | GET /api/enrollments/:id retorna detalhes da matrícula | P0 | ⚫ | `tests/integration/api/enrollments/get.test.ts` | - |
| INT-ENROLL-005 | RLS policy impede estudante ver matrícula de outro | P0 | ⚫ | `tests/integration/api/enrollments/rls.test.ts` | - |

### 5.3 CONTENT - Cursos/Módulos/Lições (8 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-CONTENT-001 | GET /api/courses retorna lista de cursos ativos | P0 | ⚫ | `tests/integration/api/courses/list.test.ts` | - |
| INT-CONTENT-002 | GET /api/courses/:id retorna detalhes do curso | P0 | ⚫ | `tests/integration/api/courses/get.test.ts` | - |
| INT-CONTENT-003 | GET /api/courses/:id/modules retorna módulos do curso | P0 | ⚫ | `tests/integration/api/courses/modules.test.ts` | - |
| INT-CONTENT-004 | GET /api/modules/:id/lessons retorna lições do módulo | P0 | ⚫ | `tests/integration/api/modules/lessons.test.ts` | - |
| INT-CONTENT-005 | GET /api/lessons/:id retorna conteúdo da lição | P0 | ⚫ | `tests/integration/api/lessons/get.test.ts` | - |
| INT-CONTENT-006 | POST /api/lessons/:id/complete marca lição como concluída | P0 | ⚫ | `tests/integration/api/lessons/complete.test.ts` | - |
| INT-CONTENT-007 | RLS policy impede acesso a curso sem matrícula | P0 | ⚫ | `tests/integration/api/courses/rls.test.ts` | - |
| INT-CONTENT-008 | Student só vê cursos de sua organização | P0 | ⚫ | `tests/integration/api/courses/rls-org.test.ts` | - |

### 5.4 TESTS - Testes/Assignments (12 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-TESTS-001 | GET /api/tests/:id retorna questões do teste | P0 | ⚫ | `tests/integration/api/tests/get.test.ts` | - |
| INT-TESTS-002 | POST /api/tests/:id/start cria test_attempt | P0 | ⚫ | `tests/integration/api/tests/start.test.ts` | - |
| INT-TESTS-003 | POST /api/tests/:id/start retorna 409 se já iniciado | P0 | ⚫ | `tests/integration/api/tests/start.test.ts` | - |
| INT-TESTS-004 | POST /api/tests/:id/submit calcula nota corretamente | P0 | ⚫ | `tests/integration/api/tests/submit.test.ts` | - |
| INT-TESTS-005 | POST /api/tests/:id/submit cria test_grade | P0 | ⚫ | `tests/integration/api/tests/submit.test.ts` | - |
| INT-TESTS-006 | POST /api/tests/:id/submit atualiza enrollment.progress | P0 | ⚫ | `tests/integration/api/tests/submit.test.ts` | - |
| INT-TESTS-007 | POST /api/tests/:id/submit retorna 400 se fora do tempo limite | P0 | ⚫ | `tests/integration/api/tests/submit.test.ts` | - |
| INT-TESTS-008 | GET /api/tests/:id/attempts retorna tentativas do estudante | P1 | ⚫ | `tests/integration/api/tests/attempts.test.ts` | - |
| INT-TESTS-009 | GET /api/tests/:id/results/:attemptId retorna resultado detalhado | P1 | ⚫ | `tests/integration/api/tests/results.test.ts` | - |
| INT-TESTS-010 | RLS policy impede estudante ver respostas corretas antes de submeter | P0 | ⚫ | `tests/integration/api/tests/rls.test.ts` | - |
| INT-TESTS-011 | Student só acessa testes de cursos matriculados | P0 | ⚫ | `tests/integration/api/tests/rls-enrollment.test.ts` | - |
| INT-TESTS-012 | Test com max_attempts=3 bloqueia 4ª tentativa | P1 | ⚫ | `tests/integration/api/tests/max-attempts.test.ts` | - |

### 5.5 GRADES - Notas (5 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-GRADES-001 | GET /api/students/:id/grades retorna notas do estudante | P0 | ⚫ | `tests/integration/api/grades/list.test.ts` | - |
| INT-GRADES-002 | POST /api/grades/manual permite teacher atribuir nota manual | P0 | ⚫ | `tests/integration/api/grades/manual.test.ts` | - |
| INT-GRADES-003 | POST /api/grades/manual retorna 403 se student tentar usar | P0 | ⚫ | `tests/integration/api/grades/manual.test.ts` | - |
| INT-GRADES-004 | GET /api/courses/:id/grades retorna notas de todos estudantes (teacher) | P0 | ⚫ | `tests/integration/api/grades/course.test.ts` | - |
| INT-GRADES-005 | RLS policy impede estudante ver notas de outros | P0 | ⚫ | `tests/integration/api/grades/rls.test.ts` | - |

### 5.6 CERTIFICATES - Certificados (5 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-CERT-001 | POST /api/certificates cria solicitação com sucesso | P0 | ⚫ | `tests/integration/api/certificates/create.test.ts` | - |
| INT-CERT-002 | POST /api/certificates retorna 400 se curso não concluído | P0 | ⚫ | `tests/integration/api/certificates/create.test.ts` | - |
| INT-CERT-003 | POST /api/certificates retorna 400 se reprovado | P0 | ⚫ | `tests/integration/api/certificates/create.test.ts` | - |
| INT-CERT-004 | PUT /api/certificates/:id/approve aprova certificado (admin) | P0 | ⚫ | `tests/integration/api/certificates/approve.test.ts` | - |
| INT-CERT-005 | GET /api/certificates/:id/download retorna PDF | P1 | ⚫ | `tests/integration/api/certificates/download.test.ts` | - |

### 5.7 TCC - Trabalhos de Conclusão (4 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-TCC-001 | POST /api/tcc cria submissão com upload de arquivo | P1 | ⚫ | `tests/integration/api/tcc/submit.test.ts` | - |
| INT-TCC-002 | POST /api/tcc retorna 400 sem arquivo | P1 | ⚫ | `tests/integration/api/tcc/submit.test.ts` | - |
| INT-TCC-003 | PUT /api/tcc/:id/grade permite teacher avaliar | P1 | ⚫ | `tests/integration/api/tcc/grade.test.ts` | - |
| INT-TCC-004 | GET /api/tcc/:id/download permite download (student/teacher) | P1 | ⚫ | `tests/integration/api/tcc/download.test.ts` | - |

### 5.8 GDRIVE - Importação Google Drive (8 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-GDRIVE-001 | POST /api/import/gdrive inicia importação com URL válida | P1 | ⚫ | `tests/integration/api/gdrive/start.test.ts` | - |
| INT-GDRIVE-002 | POST /api/import/gdrive retorna 400 com URL inválida | P1 | ⚫ | `tests/integration/api/gdrive/start.test.ts` | - |
| INT-GDRIVE-003 | POST /api/import/gdrive retorna 401 sem token de acesso | P1 | ⚫ | `tests/integration/api/gdrive/start.test.ts` | - |
| INT-GDRIVE-004 | GET /api/import/gdrive/:id retorna status da importação | P1 | ⚫ | `tests/integration/api/gdrive/status.test.ts` | - |
| INT-GDRIVE-005 | Importação cria records em materials_imported | P1 | ⚫ | `tests/integration/api/gdrive/import.test.ts` | - |
| INT-GDRIVE-006 | Importação faz download e upload para Supabase Storage | P1 | ⚫ | `tests/integration/api/gdrive/storage.test.ts` | - |
| INT-GDRIVE-007 | Importação trata erro de timeout (>30s) | P1 | ⚫ | `tests/integration/api/gdrive/timeout.test.ts` | - |
| INT-GDRIVE-008 | Importação deduplica arquivos por gdrive_file_id | P1 | ⚫ | `tests/integration/api/gdrive/dedupe.test.ts` | - |

### 5.9 REPORTS - Relatórios (6 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-REPORTS-001 | GET /api/reports/student/:id/history retorna histórico em JSON | P1 | ⚫ | `tests/integration/api/reports/history.test.ts` | - |
| INT-REPORTS-002 | GET /api/reports/student/:id/history.xlsx retorna Excel válido | P1 | ⚫ | `tests/integration/api/reports/history-excel.test.ts` | - |
| INT-REPORTS-003 | GET /api/reports/student/:id/history.pdf retorna PDF válido | P1 | ⚫ | `tests/integration/api/reports/history-pdf.test.ts` | - |
| INT-REPORTS-004 | GET /api/reports/course/:id/grades retorna notas de todos estudantes | P1 | ⚫ | `tests/integration/api/reports/course-grades.test.ts` | - |
| INT-REPORTS-005 | Excel gerado contém headers corretos e dados formatados | P1 | ⚫ | `tests/integration/api/reports/excel-validation.test.ts` | - |
| INT-REPORTS-006 | PDF gerado contém logo da organização e dados completos | P1 | ⚫ | `tests/integration/api/reports/pdf-validation.test.ts` | - |

### 5.10 STORAGE - Upload/Download (4 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-STORAGE-001 | POST /api/storage/upload faz upload de arquivo para Supabase Storage | P1 | ⚫ | `tests/integration/api/storage/upload.test.ts` | - |
| INT-STORAGE-002 | POST /api/storage/upload retorna 400 se arquivo >10MB | P1 | ⚫ | `tests/integration/api/storage/upload.test.ts` | - |
| INT-STORAGE-003 | GET /api/storage/:key retorna arquivo do Storage | P1 | ⚫ | `tests/integration/api/storage/download.test.ts` | - |
| INT-STORAGE-004 | DELETE /api/storage/:key remove arquivo do Storage | P1 | ⚫ | `tests/integration/api/storage/delete.test.ts` | - |

### 5.11 TRANSACTIONS - Transações e Consistência (5 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-TX-001 | Submit de teste cria test_attempt + test_grade atomicamente | P0 | ⚫ | `tests/integration/db/transactions/test-submit.test.ts` | - |
| INT-TX-002 | Falha em criar test_grade causa rollback de test_attempt | P0 | ⚫ | `tests/integration/db/transactions/test-rollback.test.ts` | - |
| INT-TX-003 | Importação GDrive cria múltiplos materials_imported atomicamente | P1 | ⚫ | `tests/integration/db/transactions/gdrive-import.test.ts` | - |
| INT-TX-004 | Falha em upload para Storage causa rollback de materials_imported | P1 | ⚫ | `tests/integration/db/transactions/gdrive-rollback.test.ts` | - |
| INT-TX-005 | Criação de enrollment com progress inicial é atômica | P0 | ⚫ | `tests/integration/db/transactions/enrollment.test.ts` | - |

### 5.12 SEARCH - Busca e Filtros (3 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-SEARCH-001 | GET /api/courses?search=intro retorna cursos com "intro" no título | P2 | ⚫ | `tests/integration/api/search/courses.test.ts` | - |
| INT-SEARCH-002 | GET /api/students?search=joão retorna estudantes com "joão" no nome | P2 | ⚫ | `tests/integration/api/search/students.test.ts` | - |
| INT-SEARCH-003 | Search é case-insensitive e remove acentos | P2 | ⚫ | `tests/integration/api/search/normalization.test.ts` | - |

### 5.13 NOTIFICATIONS - Notificações (2 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Evidência |
|----|-----------|-----------|--------|---------|-----------|
| INT-NOTIF-001 | Aprovação de certificado cria notificação para estudante | P2 | ⚫ | `tests/integration/api/notifications/certificate.test.ts` | - |
| INT-NOTIF-002 | GET /api/notifications retorna notificações não lidas | P2 | ⚫ | `tests/integration/api/notifications/list.test.ts` | - |

---

## 6. CASOS DE TESTE E2E

> **Total:** 15 casos
> **Escopo:** Fluxo completo usuário → UI → back → DB
> **Ferramentas:** Playwright
> **Ambiente:** App rodando + DB de teste

### 6.1 AUTH - Autenticação (2 casos)

| ID | Descrição | Prioridade | Status | Arquivo | User Journey |
|----|-----------|-----------|--------|---------|--------------|
| E2E-AUTH-001 | Login com credenciais válidas redireciona para dashboard | P0 | ⚫ | `tests/e2e/auth.spec.ts` | Onboarding |
| E2E-AUTH-002 | Login com senha incorreta exibe erro | P0 | ⚫ | `tests/e2e/auth.spec.ts` | Onboarding |

### 6.2 ENROLLMENTS - Matrículas (2 casos)

| ID | Descrição | Prioridade | Status | Arquivo | User Journey |
|----|-----------|-----------|--------|---------|--------------|
| E2E-ENROLL-001 | Estudante matricula-se em curso e vê progresso 0% | P0 | ⚫ | `tests/e2e/enrollment.spec.ts` | Enrollment |
| E2E-ENROLL-002 | Estudante já matriculado vê mensagem "Já matriculado" | P0 | ⚫ | `tests/e2e/enrollment.spec.ts` | Enrollment |

### 6.3 CONTENT - Visualização de Conteúdo (1 caso)

| ID | Descrição | Prioridade | Status | Arquivo | User Journey |
|----|-----------|-----------|--------|---------|--------------|
| E2E-CONTENT-001 | Estudante navega por curso → módulo → lição e marca como concluída | P0 | ⚫ | `tests/e2e/content-viewing.spec.ts` | Content Viewing |

### 6.4 TESTS - Realização de Testes (3 casos)

| ID | Descrição | Prioridade | Status | Arquivo | User Journey |
|----|-----------|-----------|--------|---------|--------------|
| E2E-TESTS-001 | Estudante realiza teste, submete e vê nota imediatamente | P0 | ⚫ | `tests/e2e/test-taking.spec.ts` | Test Taking |
| E2E-TESTS-002 | Estudante tenta submeter teste sem responder todas as questões | P0 | ⚫ | `tests/e2e/test-taking.spec.ts` | Test Taking |
| E2E-TESTS-003 | Timer expira e teste é submetido automaticamente | P0 | ⚫ | `tests/e2e/test-taking.spec.ts` | Test Taking |

### 6.5 GRADES - Visualização de Notas (1 caso)

| ID | Descrição | Prioridade | Status | Arquivo | User Journey |
|----|-----------|-----------|--------|---------|--------------|
| E2E-GRADES-001 | Estudante acessa dashboard e vê notas de todos os testes | P0 | ⚫ | `tests/e2e/grades.spec.ts` | Dashboard |

### 6.6 CERTIFICATES - Certificados (1 caso)

| ID | Descrição | Prioridade | Status | Arquivo | User Journey |
|----|-----------|-----------|--------|---------|--------------|
| E2E-CERT-001 | Estudante conclui curso, solicita certificado e aguarda aprovação | P1 | ⚫ | `tests/e2e/certificate.spec.ts` | Certificate Request |

### 6.7 TCC - Submissão de TCC (1 caso)

| ID | Descrição | Prioridade | Status | Arquivo | User Journey |
|----|-----------|-----------|--------|---------|--------------|
| E2E-TCC-001 | Estudante faz upload de TCC e vê status "Aguardando avaliação" | P1 | ⚫ | `tests/e2e/tcc.spec.ts` | TCC Submission |

### 6.8 GDRIVE - Importação Google Drive (1 caso)

| ID | Descrição | Prioridade | Status | Arquivo | User Journey |
|----|-----------|-----------|--------|---------|--------------|
| E2E-GDRIVE-001 | Admin importa materiais do Google Drive e vê progresso em tempo real | P1 | ⚫ | `tests/e2e/gdrive-import.spec.ts` | Google Drive Import |

### 6.9 ADMIN - Funcionalidades Admin (1 caso)

| ID | Descrição | Prioridade | Status | Arquivo | User Journey |
|----|-----------|-----------|--------|---------|--------------|
| E2E-ADMIN-001 | Admin usa "View as Student" e vê interface como estudante | P1 | ⚫ | `tests/e2e/admin-view-as.spec.ts` | View as Student |

### 6.10 REPORTS - Relatórios (1 caso)

| ID | Descrição | Prioridade | Status | Arquivo | User Journey |
|----|-----------|-----------|--------|---------|--------------|
| E2E-REPORTS-001 | Teacher gera relatório Excel de histórico do estudante | P1 | ⚫ | `tests/e2e/reports.spec.ts` | Reports Generation |

### 6.11 ACCESSIBILITY - Acessibilidade (1 caso)

| ID | Descrição | Prioridade | Status | Arquivo | User Journey |
|----|-----------|-----------|--------|---------|--------------|
| E2E-A11Y-001 | Navegação por teclado (Tab, Enter) funciona em fluxo de teste | P1 | ⚫ | `tests/e2e/accessibility.spec.ts` | - |

---

## 7. CASOS DE TESTE DE SEGURANÇA

> **Total:** 12 casos
> **Escopo:** RLS, auth, injection, OWASP
> **Ferramentas:** Vitest + SQL scripts
> **Ambiente:** DB de teste

### 7.1 RLS - Row Level Security (12 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Tabela |
|----|-----------|-----------|--------|---------|--------|
| SEC-RLS-001 | Student só acessa enrollments da própria organização | P0 | ⚫ | `tests/security/rls/enrollments.test.ts` | enrollments |
| SEC-RLS-002 | Student só acessa courses da própria organização | P0 | ⚫ | `tests/security/rls/courses.test.ts` | courses |
| SEC-RLS-003 | Student só acessa test_attempts próprios | P0 | ⚫ | `tests/security/rls/test_attempts.test.ts` | test_attempts |
| SEC-RLS-004 | Student só acessa test_grades próprios | P0 | ⚫ | `tests/security/rls/test_grades.test.ts` | test_grades |
| SEC-RLS-005 | Student não acessa users de outra organização | P0 | ⚫ | `tests/security/rls/users.test.ts` | users |
| SEC-RLS-006 | Teacher acessa test_attempts de estudantes da organização | P0 | ⚫ | `tests/security/rls/test_attempts-teacher.test.ts` | test_attempts |
| SEC-RLS-007 | Teacher não acessa test_attempts de outras organizações | P0 | ⚫ | `tests/security/rls/test_attempts-teacher.test.ts` | test_attempts |
| SEC-RLS-008 | Admin acessa todos os recursos da organização | P0 | ⚫ | `tests/security/rls/admin.test.ts` | * |
| SEC-RLS-009 | Admin não acessa recursos de outras organizações | P0 | ⚫ | `tests/security/rls/admin.test.ts` | * |
| SEC-RLS-010 | INSERT em enrollments respeita organization_id do usuário | P0 | ⚫ | `tests/security/rls/enrollments-insert.test.ts` | enrollments |
| SEC-RLS-011 | UPDATE em test_grades só permite mudança de nota se teacher/admin | P0 | ⚫ | `tests/security/rls/test_grades-update.test.ts` | test_grades |
| SEC-RLS-012 | DELETE em materials_imported só permite se owner ou admin | P0 | ⚫ | `tests/security/rls/materials-delete.test.ts` | materials_imported |

### 7.2 AUTH - Elevação de Privilégio (3 casos já cobertos em INT-AUTH)

Referência: INT-AUTH-009, INT-AUTH-010, INT-AUTH-011

### 7.3 OWASP - Injeções e XSS (3 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Vetor |
|----|-----------|-----------|--------|---------|-------|
| SEC-OWASP-001 | Input malicioso em search não causa SQL Injection | P0 | ⚫ | `tests/security/owasp/sql-injection.test.ts` | `?search='; DROP TABLE users--` |
| SEC-OWASP-002 | Markdown com script é sanitizado antes de renderizar | P0 | ⚫ | `tests/security/owasp/xss.test.ts` | `<script>alert(1)</script>` |
| SEC-OWASP-003 | CSRF token validado em mutações (POST/PUT/DELETE) | P0 | ⚫ | `tests/security/owasp/csrf.test.ts` | Request sem token |

---

## 8. CASOS DE TESTE DE PERFORMANCE

> **Total:** 5 casos
> **Escopo:** Latência, throughput, orçamentos
> **Ferramentas:** Vitest + benchmarks
> **Ambiente:** DB com carga realista

### 8.1 API - Orçamentos de Latência (5 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Orçamento |
|----|-----------|-----------|--------|---------|-----------|
| PERF-API-001 | GET /api/courses responde em <200ms (p50), <1s (p95) | P0 | ⚫ | `tests/performance/api/courses.test.ts` | p50: 200ms, p95: 1s |
| PERF-API-002 | GET /api/courses/:id responde em <150ms (p50), <800ms (p95) | P0 | ⚫ | `tests/performance/api/course-detail.test.ts` | p50: 150ms, p95: 800ms |
| PERF-API-003 | POST /api/tests/:id/submit responde em <500ms (p50), <2s (p95) | P0 | ⚫ | `tests/performance/api/test-submit.test.ts` | p50: 500ms, p95: 2s |
| PERF-API-004 | GET /api/reports/student/:id/history responde em <1s (p50), <3s (p95) | P0 | ⚫ | `tests/performance/api/reports.test.ts` | p50: 1s, p95: 3s |
| PERF-API-005 | POST /api/import/gdrive processa 10 arquivos em <30s | P0 | ⚫ | `tests/performance/api/gdrive-import.test.ts` | 30s para 10 arquivos |

---

## 9. CASOS DE SMOKE TEST

> **Total:** 3 casos
> **Escopo:** Health checks pós-deploy
> **Ferramentas:** Playwright ou curl
> **Ambiente:** Produção/Staging

### 9.1 HEALTH - Health Checks (2 casos)

| ID | Descrição | Prioridade | Status | Arquivo | Endpoint |
|----|-----------|-----------|--------|---------|----------|
| SMOKE-HEALTH-001 | GET /health/live retorna 200 (app está rodando) | P0 | ⚫ | `tests/smoke/health.spec.ts` | /health/live |
| SMOKE-HEALTH-002 | GET /health/ready retorna 200 (DB conectado) | P0 | ⚫ | `tests/smoke/health.spec.ts` | /health/ready |

### 9.2 SMOKE - Operações Críticas (1 caso)

| ID | Descrição | Prioridade | Status | Arquivo | Operação |
|----|-----------|-----------|--------|---------|----------|
| SMOKE-001 | Login → Criar enrollment → Ler curso → Deletar enrollment | P0 | ⚫ | `tests/smoke/critical-path.spec.ts` | CRUD básico |

---

## 10. MÉTRICAS E COBERTURA

### 10.1 Metas de Cobertura por Camada

| Camada | Meta | Prioridade | Justificativa |
|--------|------|-----------|---------------|
| **lib/** | 100% | P0 | Funções puras, fácil testar, críticas |
| **services/** | 95% | P0 | Lógica de negócio core |
| **app/api/** | 90% | P0 | Endpoints expostos, críticos |
| **components/** | 70% | P1 | Componentes complexos (TestTaking, FileUploader) |
| **app/** | 50% | P2 | Páginas (cobertas por E2E) |

### 10.2 Dashboards e Relatórios

- **Cobertura**: LCOV + HTML report gerado por Vitest
- **Performance**: Gráficos de latência p50/p95 por endpoint
- **Flakiness**: Taxa de falhas por teste (meta: <1%)
- **Execução**: Tempo total da suite (meta: <20min no CI)

### 10.3 KPIs

| KPI | Meta | Atual | Status |
|-----|------|-------|--------|
| **Cobertura Global** | 60% | ~5-10% | 🔴 |
| **Cobertura lib/** | 100% | 0% | 🔴 |
| **Cobertura services/** | 95% | ~30% (StudentHistoryService) | 🟡 |
| **Cobertura app/api/** | 90% | 0% | 🔴 |
| **Testes E2E P0** | 100% (9 specs) | 0% | 🔴 |
| **RLS Policies** | 100% (12 tests) | 0% | 🔴 |
| **Tempo de Execução CI** | <20min | N/A | ⚪ |
| **Flakiness Rate** | <1% | N/A | ⚪ |

---

## 11. EVOLUÇÃO E MANUTENÇÃO

### 11.1 Adicionando Novos Casos

1. **Novo Endpoint**: adicionar INT test antes de merge
2. **Novo Componente Crítico**: adicionar UNIT test com >80% cobertura
3. **Novo Fluxo de Usuário**: adicionar E2E test (pelo menos happy path)
4. **Nova Integração Externa**: adicionar INT test com mocks

### 11.2 Revisão Trimestral

- Atualizar CONTEXTO_DERIVADO_AUTOMATICAMENTE.md
- Revisar prioridades P0/P1/P2
- Identificar testes flaky e corrigir
- Atualizar seeds de teste
- Revisar orçamentos de performance

### 11.3 Políticas de Qualidade

- ❌ **Bloqueia merge**:
  - Qualquer teste P0 falhando
  - Cobertura < thresholds
  - Lint/type errors

- ⚠️ **Warning**:
  - Cobertura diminuiu >2%
  - Testes P1 falhando
  - Tempo de execução aumentou >20%

---

## 12. REFERÊNCIAS

- **CONTEXTO_DERIVADO_AUTOMATICAMENTE.md**: Inventário completo da arquitetura
- **PLANO_DE_TESTES.md**: Estratégia e ferramentas
- **CHECKLIST-E2E.md**: Checklist detalhado para E2E
- **Código Fonte**: `/home/y0n/Documentos/swiftlms/`
- **Evidências**: Arquivos de teste existentes em `src/__tests__/`

---

## 13. CHANGELOG

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0.0 | 2025-11-08 | Auto-generated | Criação inicial baseada em CONTEXTO_DERIVADO |

---

**FIM DO CATÁLOGO DE CASOS DE TESTE**

> Este documento é vivo e deve ser atualizado conforme novos casos são adicionados, prioridades mudam, ou a arquitetura evolui.
