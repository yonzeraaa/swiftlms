#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Arquivos para corrigir
const files = [
  'app/api/courses/enroll/route.ts',
  'app/api/tests/[id]/submit/route.ts',
  'app/api/tests/[id]/sync-answer-key/route.ts',
  'app/api/tests/extract-answer-key/route.ts',
  'app/api/auth/check-view-mode/route.ts',
  'app/api/auth/fix-session/route.ts',
  'app/api/auth/force-login/route.ts',
  'app/api/auth/session-debug/route.ts',
  'app/api/auth/verify-view-mode/route.ts',
  'app/api/certificates/check-eligibility/route.ts',
  'app/api/admin/assign-grade/route.ts',
];

function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ Arquivo não encontrado: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Adicionar import do logger se não existir
  if (!content.includes("from '@/lib/utils/logger'")) {
    const importMatch = content.match(/^import .* from ['"].*['"]\n/m);
    if (importMatch) {
      const lastImport = content.lastIndexOf(importMatch[0]) + importMatch[0].length;
      content = content.slice(0, lastImport) +
        "import { logger } from '@/lib/utils/logger'\n" +
        content.slice(lastImport);
      modified = true;
    }
  }

  // Substituir console.error
  if (content.includes('console.error(')) {
    content = content.replace(
      /console\.error\(['"]([^'"]+)['"],\s*(\w+)\)/g,
      (match, message, errorVar) => `logger.error('${message}', ${errorVar}, { context: '${getContext(filePath)}' })`
    );
    content = content.replace(
      /console\.error\(['"]([^'"]+)['"]\)/g,
      (match, message) => `logger.error('${message}', undefined, { context: '${getContext(filePath)}' })`
    );
    modified = true;
  }

  // Substituir console.log
  if (content.includes('console.log(')) {
    content = content.replace(
      /console\.log\(/g,
      `logger.debug(`
    );
    modified = true;
  }

  // Substituir console.warn
  if (content.includes('console.warn(')) {
    content = content.replace(
      /console\.warn\(/g,
      `logger.warn(`
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Corrigido: ${filePath}`);
  } else {
    console.log(`⏭️ Nenhuma alteração: ${filePath}`);
  }
}

function getContext(filePath) {
  const match = filePath.match(/api\/([^/]+)/);
  if (!match) return 'API';
  return match[1].toUpperCase().replace(/-/g, '_');
}

console.log('🔧 Corrigindo console.log/error/warn...\n');
files.forEach(fixFile);
console.log('\n✨ Concluído!');
