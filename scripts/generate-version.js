#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Gera arquivo version.json com informações do Git
 */
function generateVersion() {
  try {
    // Obter hash curto do commit
    const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

    // Obter branch atual
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

    // Obter data do último commit
    const gitDate = execSync('git log -1 --format=%cd --date=iso', { encoding: 'utf-8' }).trim();

    // Obter mensagem do último commit
    const gitMessage = execSync('git log -1 --format=%s', { encoding: 'utf-8' }).trim();

    // Ler versão do package.json
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
    const baseVersion = packageJson.version || '1.0.0';

    // Criar objeto de versão
    const versionInfo = {
      version: `${baseVersion}+${gitHash}`,
      baseVersion,
      gitHash,
      gitBranch,
      gitDate,
      gitMessage,
      buildDate: new Date().toISOString(),
      buildTimestamp: Date.now()
    };

    // Escrever arquivo version.json na pasta public
    const outputPath = path.join(__dirname, '../public/version.json');
    fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

    console.log('✅ Version file generated successfully!');
    console.log(`📦 Version: ${versionInfo.version}`);
    console.log(`🔀 Branch: ${versionInfo.gitBranch}`);
    console.log(`📝 Commit: ${versionInfo.gitMessage}`);

  } catch (error) {
    console.error('❌ Error generating version:', error.message);

    // Criar versão fallback se houver erro (ex: não é um repositório Git)
    const fallbackVersion = {
      version: '1.0.0-dev',
      baseVersion: '1.0.0',
      gitHash: 'unknown',
      gitBranch: 'unknown',
      gitDate: new Date().toISOString(),
      gitMessage: 'Development build',
      buildDate: new Date().toISOString(),
      buildTimestamp: Date.now()
    };

    const outputPath = path.join(__dirname, '../public/version.json');
    fs.writeFileSync(outputPath, JSON.stringify(fallbackVersion, null, 2));
    console.log('⚠️ Created fallback version file');
  }
}

// Executar
generateVersion();
