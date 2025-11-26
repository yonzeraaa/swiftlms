# Guia de Testes Automatizados

## Visão Geral
A suíte utiliza [Vitest](https://vitest.dev/) com ambiente `jsdom` e Testing Library para validar fluxos críticos da SwiftEDU sem depender de um navegador real. Os testes atuais cobrem:

- Matrícula automática de administradores e instrutores ao usar o "Portal do Aluno" (`middleware.ts`).
- Matrículas em massa via API (`app/api/courses/__tests__/enroll-route.test.ts`).
- Envio de avaliações, geração de tentativas e solicitação automática de certificados (`app/api/tests/__tests__/submit-route.test.ts`).
- Elegibilidade e criação de certificados (`app/api/certificates/__tests__/check-eligibility.test.ts`).

## Comandos

- `npm run test` — executa Vitest em modo observação.
- `npm run test:ci` — executa os testes uma vez (sem watch) e é usado pelo `npm run lint:full`.
- `npm run test:coverage` — executa `test:ci` e gera relatórios em `coverage/` (formato HTML e LCOV).

O comando `npm run lint:full` agora encadeia lint, type-check e `test:ci`; ele deve ser executado antes de qualquer `git push`.

## Escrevendo Novos Testes

1. Crie um diretório `__tests__` próximo ao módulo alvo (ex.: `app/student-dashboard/__tests__/`).
2. Tipos e helpers globais podem ser importados via alias `@/...` graças ao `vitest.config.ts`.
3. Para interagir com Supabase nos testes, use os clientes mocks providos nos arquivos existentes como referência ou crie stubs simples com os tipos de `lib/database.types`.
4. Ao testar componentes React, importe utilitários do Testing Library (`render`, `screen`, `userEvent`).
5. Use `describe.each` e factories (`create*Fixture`) para cobrir cenários positivos e negativos com a menor duplicação possível.

## Cobertura

Os relatórios são gravados em `coverage/` e podem ser abertos diretamente no navegador (`coverage/index.html`). Nenhum limite mínimo está configurado ainda, mas monitore os índices para manter pelo menos 80% dos arquivos críticos acima desse valor.

## Testes Manuais

Apesar da suíte automatizada, continue registrando verificações manuais em cada PR:

- `node scripts/create-test-user.js` para preparar usuários de teste.
- Rota `app/test-auth` para validar sessões Supabase.
- Fluxos de matrícula, submissão de avaliações e emissão de certificados no ambiente de staging.

Documente no PR quais comandos foram executados e quaisquer variações manuais relevantes.
