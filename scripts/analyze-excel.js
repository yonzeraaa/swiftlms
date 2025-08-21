const XLSX = require('xlsx');
const path = require('path');

// Ler o arquivo Excel
const filePath = '/home/y0nzera/Downloads/IPETEC-LOGISTICA-REESTRUTURAÇÃO.xlsx';
const workbook = XLSX.readFile(filePath);

// Listar todas as abas
console.log('Abas disponíveis:', workbook.SheetNames);

// Procurar pela aba "Estrutura"
const estruturaSheet = workbook.Sheets['Estrutura'];
if (!estruturaSheet) {
  console.log('Aba "Estrutura" não encontrada. Tentando a primeira aba...');
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  
  // Converter para JSON
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('\nPrimeiras 15 linhas da aba "' + firstSheetName + '":');
  data.slice(0, 15).forEach((row, index) => {
    console.log(`Linha ${index}:`, row);
  });
} else {
  // Converter para JSON
  const data = XLSX.utils.sheet_to_json(estruturaSheet, { header: 1 });
  
  console.log('\nPrimeiras 15 linhas da aba "Estrutura":');
  data.slice(0, 15).forEach((row, index) => {
    console.log(`Linha ${index}:`, row);
  });
}