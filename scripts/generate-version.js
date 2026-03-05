#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function readPackageVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
  return packageJson.version || '1.0.0';
}

function tryExec(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/**
 * Gera arquivo version.json com informações do Git
 */
function generateVersion() {
  const baseVersion = readPackageVersion();

  try {
    const gitHash = tryExec('git rev-parse --short HEAD');
    const gitBranch = tryExec('git rev-parse --abbrev-ref HEAD');
    const gitDate = tryExec('git log -1 --format=%cd --date=iso');
    const gitMessage = tryExec('git log -1 --format=%s');

    if (!gitHash || !gitBranch || !gitDate || !gitMessage) {
      throw new Error('Git metadata unavailable');
    }

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
    // Criar versão fallback se houver erro (ex: não é um repositório Git)
    const fallbackVersion = {
      version: `${baseVersion}-dev`,
      baseVersion,
      gitHash: 'unknown',
      gitBranch: 'unknown',
      gitDate: new Date().toISOString(),
      gitMessage: 'Development build',
      buildDate: new Date().toISOString(),
      buildTimestamp: Date.now()
    };

    const outputPath = path.join(__dirname, '../public/version.json');
    fs.writeFileSync(outputPath, JSON.stringify(fallbackVersion, null, 2));
    console.log(`⚠️ Git metadata unavailable, created fallback version file (${fallbackVersion.version})`);
  }
}

// Executar
generateVersion();
