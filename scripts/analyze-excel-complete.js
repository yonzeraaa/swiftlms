const XLSX = require('xlsx');

// Ler o arquivo Excel
const filePath = '/home/y0nzera/Downloads/IPETEC-LOGISTICA-REESTRUTURAÇÃO.xlsx';
const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

let modules = [];
let currentModule = null;

// Processar as linhas
data.forEach((row, index) => {
  if (row[1] && typeof row[1] === 'string') {
    // Verificar se é um módulo
    if (row[1].includes('MÓDULO')) {
      // Se já tínhamos um módulo anterior, salvá-lo
      if (currentModule) {
        modules.push(currentModule);
      }
      
      // Criar novo módulo
      currentModule = {
        title: row[1].trim() + ' ' + (row[2] || '').trim(),
        subjects: [],
        totalHours: 0
      };
    } 
    // Verificar se é uma disciplina (começa com DCA)
    else if (row[1].match(/^DCA\d+/)) {
      if (currentModule && row[2] && row[3]) {
        const subject = {
          code: row[1].trim(),
          name: row[2].trim(),
          hours: parseInt(row[3]) || 0,
          description: row[4] ? row[4].trim() : ''
        };
        currentModule.subjects.push(subject);
        currentModule.totalHours += subject.hours;
      }
    }
  }
});

// Adicionar o último módulo
if (currentModule) {
  modules.push(currentModule);
}

// Mostrar estrutura completa
console.log('\n=== ESTRUTURA COMPLETA DO CURSO ===\n');
modules.forEach((module, index) => {
  console.log(`\n${module.title}`);
  console.log(`Carga Horária Total: ${module.totalHours}h`);
  console.log('Disciplinas:');
  module.subjects.forEach(subject => {
    console.log(`  - ${subject.code}: ${subject.name} (${subject.hours}h)`);
    if (subject.description) {
      console.log(`    Descrição: ${subject.description}`);
    }
  });
});

// Estatísticas
const totalHours = modules.reduce((sum, mod) => sum + mod.totalHours, 0);
const totalSubjects = modules.reduce((sum, mod) => sum + mod.subjects.length, 0);

console.log('\n=== ESTATÍSTICAS ===');
console.log(`Total de Módulos: ${modules.length}`);
console.log(`Total de Disciplinas: ${totalSubjects}`);
console.log(`Carga Horária Total: ${totalHours}h`);

// Exportar como JSON
const fs = require('fs');
fs.writeFileSync('/home/y0nzera/Documentos/swiftlms/scripts/course-structure.json', JSON.stringify(modules, null, 2));
console.log('\nEstrutura exportada para: course-structure.json');