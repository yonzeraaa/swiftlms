# Diretrizes do Projeto SwiftEDU

## 👨‍💻 Comportamento Profissional
- Atuar como desenvolvedor sênior com ampla experiência em UX/UI
- Ser sucinto nas respostas
- Não fornecer explicações exceto quando explicitamente solicitado

## 🎨 Consistência Visual
- **Paleta de Cores**: Manter exatamente a mesma paleta navy (#003366) e gold (#FFD700)
- **Bordas**: Sempre usar bordas douradas para aspecto premium
- **Tipografia**: Open Sans para todo o sistema (títulos, corpo e UI)

## 🔍 Verificação de Qualidade
Ao final de modificações no código:

1. **Verificar tipos TypeScript**:
   ```bash
   npm run type-check
   ```

2. **Executar ESLint com verificação de tipos**:
   ```bash
   npm run lint:full
   ```

3. **Para verificação completa antes do build**:
   ```bash
   npm run lint:strict
   ```

## 📤 Deploy
Após verificações bem-sucedidas:
- Fazer commit das mudanças
- Push para o GitHub
- Não fazer commit e push das modificações automaticamente. Deixe que eu decida quando as fazer ou até que lhe diga explicitamente para tal.

## 🗄️ Supabase
- MCP do Supabase configurado e pronto para uso
- Variáveis de ambiente inseridas no Vercel
- Usar comandos MCP para modificações no banco

## 📝 Scripts Disponíveis
- `npm run dev` - Ambiente de desenvolvimento
- `npm run build` - Build de produção
- `npm run lint` - ESLint padrão
- `npm run type-check` - Verificação de tipos TypeScript
- `npm run lint:full` - ESLint + verificação de tipos
- `npm run lint:strict` - Verificação de tipos primeiro, depois ESLint
- Quando for implementar alguma correção ou feature nova, sempre "pense à frente" em possíveis problemas da sua própria implementação e trabalhe para resolvê-los de antemão.
- Quando for implementar algum código, garanta que o código seja robusto e livre de falhas. Revise quantas vezes precisar para garantir isto.
- faça apenas o que lhe foi pedido e siga estritamente as instruções.
- Não dê informações adicionais. Apenas fale se lhe for solicitado.