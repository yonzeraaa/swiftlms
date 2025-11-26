import * as XLSX from 'xlsx';

// Detectar locale do navegador
function detectLocale(): string {
  if (typeof window !== 'undefined') {
    return navigator.language || 'en-US';
  }
  return 'en-US';
}

// Formatar número para o locale correto
function formatNumber(value: number, decimals: number = 2): number {
  // Retornar sempre como número para o Excel interpretar corretamente
  // O Excel aplicará a formatação baseada nas configurações regionais do usuário
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Verificar se é número e converter se necessário
function parseNumericValue(value: any, isPercentage: boolean = false): number | string {
  // Preservar valores vazios, null ou undefined
  if (value === '' || value === null || value === undefined) {
    return value === '' ? '' : (value || '');
  }

  if (typeof value === 'number') {
    // Se for porcentagem, manter como está (já em formato decimal ou inteiro)
    if (isPercentage && value <= 1) {
      // Se menor que 1, assumir que já está em decimal, converter para porcentagem
      return formatNumber(value * 100);
    }
    return formatNumber(value);
  }

  if (typeof value === 'string') {
    // Não processar strings que parecem datas (contém /)
    if (value.includes('/')) {
      return value;
    }

    // Remover símbolos de porcentagem
    const hasPercent = value.includes('%');
    const cleanValue = value.replace('%', '').trim();

    // Tentar converter para número
    // Aceitar tanto vírgula quanto ponto como separador decimal
    const normalizedValue = cleanValue.replace(',', '.');
    const numericValue = parseFloat(normalizedValue);

    if (!isNaN(numericValue)) {
      // Se o valor original tinha % ou é identificado como porcentagem
      // retornar o valor numérico direto (não dividir por 100)
      if (hasPercent || isPercentage) {
        return formatNumber(numericValue);
      }
      return formatNumber(numericValue);
    }
  }

  return value;
}

export interface CellFormatting {
  condition?: (value: any) => boolean;
  font?: {
    bold?: boolean;
    color?: string;
    size?: number;
  };
  fill?: {
    color?: string;
  };
  numberFormat?: string;
}

export interface ExportData {
  title: string;
  headers: string[];
  data: any[][];
  metadata?: {
    date?: string;
    period?: string;
    user?: string;
    filters?: Record<string, any>;
    locale?: string;
  };
  formatting?: {
    columns?: {
      [columnIndex: number]: CellFormatting;
    };
    rows?: {
      [rowIndex: number]: CellFormatting;
    };
    cells?: {
      [cellKey: string]: CellFormatting; // formato "R2C3" para linha 2, coluna 3
    };
    conditionalFormatting?: CellFormatting[];
  };
}

export interface PivotTableConfig {
  rows: string[];
  columns: string[];
  values: {
    field: string;
    aggregation: 'sum' | 'count' | 'average' | 'min' | 'max';
  }[];
  filters?: string[];
}

export class ExcelExporter {
  private workbook: XLSX.WorkBook;
  
  constructor() {
    this.workbook = XLSX.utils.book_new();
  }

  private applyConditionalFormatting(
    worksheet: XLSX.WorkSheet,
    value: any,
    cellAddress: string,
    formatting?: CellFormatting[]
  ) {
    if (!formatting || formatting.length === 0) return;

    // NOTA: Formatação de estilos (cores, fontes) requer xlsx-style ou XLSX Pro
    // A versão gratuita da biblioteca XLSX (SheetJS) não suporta estilos de células
    // Este código está preparado para quando a biblioteca for atualizada

    for (const format of formatting) {
      if (format.condition && format.condition(value)) {
        if (!worksheet[cellAddress].s) {
          worksheet[cellAddress].s = {};
        }

        if (format.font) {
          worksheet[cellAddress].s.font = {
            bold: format.font.bold,
            color: format.font.color ? { rgb: format.font.color.replace('#', '') } : undefined,
            sz: format.font.size
          };
        }

        if (format.fill) {
          worksheet[cellAddress].s.fill = {
            fgColor: { rgb: format.fill.color?.replace('#', '') }
          };
        }

        if (format.numberFormat) {
          worksheet[cellAddress].s.numFmt = format.numberFormat;
        }
        
        break; // Aplicar apenas a primeira formatação que corresponder
      }
    }
  }

  addDataSheet(sheetName: string, exportData: ExportData) {
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    
    let currentRow = 0;
    
    // Adicionar título
    if (exportData.title) {
      XLSX.utils.sheet_add_aoa(worksheet, [[exportData.title]], { origin: `A${currentRow + 1}` });
      worksheet['!merges'] = worksheet['!merges'] || [];
      worksheet['!merges'].push({
        s: { r: currentRow, c: 0 },
        e: { r: currentRow, c: exportData.headers.length - 1 }
      });
      currentRow += 2;
    }
    
    // Adicionar metadados
    if (exportData.metadata) {
      const metadataRows: string[][] = [];
      if (exportData.metadata.date) {
        metadataRows.push(['Data do Relatório:', exportData.metadata.date]);
      }
      if (exportData.metadata.period) {
        metadataRows.push(['Período:', exportData.metadata.period]);
      }
      if (exportData.metadata.user) {
        metadataRows.push(['Gerado por:', exportData.metadata.user]);
      }
      if (exportData.metadata.filters) {
        Object.entries(exportData.metadata.filters).forEach(([key, value]) => {
          metadataRows.push([`${key}:`, String(value)]);
        });
      }
      
      if (metadataRows.length > 0) {
        XLSX.utils.sheet_add_aoa(worksheet, metadataRows, { origin: `A${currentRow + 1}` });
        currentRow += metadataRows.length + 1;
      }
    }
    
    // Adicionar cabeçalhos
    XLSX.utils.sheet_add_aoa(worksheet, [exportData.headers], { origin: `A${currentRow + 1}` });
    currentRow++;
    
    // Adicionar dados (converter valores numéricos)
    const processedData = exportData.data.map(row =>
      row.map((cell, index) => {
        const header = exportData.headers[index]?.toLowerCase() || '';

        // Detectar se é coluna de data - preservar valor original
        const isDateColumn = header.includes('data') || header.includes('date');
        if (isDateColumn) {
          return cell; // Preservar valor original de datas
        }

        // Verificar se o cabeçalho contém indicação de porcentagem
        const isPercentage = header.includes('taxa') || header.includes('porcentagem') ||
                             header.includes('%') || header.includes('percentual');
        return parseNumericValue(cell, isPercentage);
      })
    );
    XLSX.utils.sheet_add_aoa(worksheet, processedData, { origin: `A${currentRow + 1}` });
    
    // Aplicar formatação condicional aos dados
    if (exportData.formatting) {
      for (let rowIdx = 0; rowIdx < processedData.length; rowIdx++) {
        for (let colIdx = 0; colIdx < processedData[rowIdx].length; colIdx++) {
          const cellAddress = XLSX.utils.encode_cell({ r: currentRow + rowIdx, c: colIdx });
          const cellValue = processedData[rowIdx][colIdx];
          
          if (worksheet[cellAddress]) {
            // Aplicar formatação condicional
            this.applyConditionalFormatting(
              worksheet,
              cellValue,
              cellAddress,
              exportData.formatting.conditionalFormatting
            );
            
            // Aplicar formatação específica da coluna
            if (exportData.formatting.columns && exportData.formatting.columns[colIdx]) {
              const colFormat = exportData.formatting.columns[colIdx];
              if (!colFormat.condition || colFormat.condition(cellValue)) {
                this.applyConditionalFormatting(worksheet, cellValue, cellAddress, [colFormat]);
              }
            }
            
            // Aplicar formatação específica da linha
            if (exportData.formatting.rows && exportData.formatting.rows[rowIdx]) {
              const rowFormat = exportData.formatting.rows[rowIdx];
              if (!rowFormat.condition || rowFormat.condition(cellValue)) {
                this.applyConditionalFormatting(worksheet, cellValue, cellAddress, [rowFormat]);
              }
            }
            
            // Aplicar formatação específica da célula
            const cellKey = `R${rowIdx}C${colIdx}`;
            if (exportData.formatting.cells && exportData.formatting.cells[cellKey]) {
              const cellFormat = exportData.formatting.cells[cellKey];
              if (!cellFormat.condition || cellFormat.condition(cellValue)) {
                this.applyConditionalFormatting(worksheet, cellValue, cellAddress, [cellFormat]);
              }
            }
          }
        }
      }
    }
    
    // Aplicar estilos aos cabeçalhos
    const headerRow = currentRow - 1;
    for (let i = 0; i < exportData.headers.length; i++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: i });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "003366" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "FFD700" } },
          bottom: { style: "thin", color: { rgb: "FFD700" } },
          left: { style: "thin", color: { rgb: "FFD700" } },
          right: { style: "thin", color: { rgb: "FFD700" } }
        }
      };
    }
    
    // Adicionar tabela com filtros
    const tableRange = {
      s: { r: headerRow, c: 0 },
      e: { r: currentRow + exportData.data.length - 1, c: exportData.headers.length - 1 }
    };
    
    worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(tableRange) };
    
    // Ajustar largura das colunas
    const colWidths: number[] = [];
    for (let i = 0; i < exportData.headers.length; i++) {
      let maxWidth = exportData.headers[i].length;
      for (let j = 0; j < exportData.data.length; j++) {
        const cellValue = String(exportData.data[j][i] || '');
        maxWidth = Math.max(maxWidth, cellValue.length);
      }
      colWidths.push(Math.min(maxWidth + 2, 50));
    }
    worksheet['!cols'] = colWidths.map(w => ({ wch: w }));
    
    XLSX.utils.book_append_sheet(this.workbook, worksheet, sheetName);
    
    return this;
  }

  addPivotTable(
    sheetName: string,
    sourceData: any[],
    pivotConfig: PivotTableConfig
  ) {
    // Preparar dados para tabela dinâmica
    const pivotData = this.createPivotData(sourceData, pivotConfig);
    
    // Processar dados numéricos antes de criar a planilha
    const processedPivotData = pivotData.map(row => {
      const processedRow: any = {};
      Object.keys(row).forEach(key => {
        const keyLower = key.toLowerCase();
        const isPercentage = keyLower.includes('taxa') || keyLower.includes('porcentagem') || 
                             keyLower.includes('%') || keyLower.includes('percentual') ||
                             keyLower.includes('conclusão') || keyLower.includes('aprovação');
        processedRow[key] = parseNumericValue(row[key], isPercentage);
      });
      return processedRow;
    });
    
    const worksheet = XLSX.utils.json_to_sheet(processedPivotData);
    
    // Aplicar formatação à tabela dinâmica
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Estilizar cabeçalhos
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!worksheet[address]) continue;
      
      worksheet[address].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "003366" } },
        alignment: { horizontal: "center" },
        border: {
          top: { style: "thin", color: { rgb: "FFD700" } },
          bottom: { style: "thin", color: { rgb: "FFD700" } },
          left: { style: "thin", color: { rgb: "FFD700" } },
          right: { style: "thin", color: { rgb: "FFD700" } }
        }
      };
    }
    
    // Adicionar bordas aos dados
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[address]) continue;
        
        worksheet[address].s = worksheet[address].s || {};
        worksheet[address].s.border = {
          top: { style: "thin", color: { rgb: "D3D3D3" } },
          bottom: { style: "thin", color: { rgb: "D3D3D3" } },
          left: { style: "thin", color: { rgb: "D3D3D3" } },
          right: { style: "thin", color: { rgb: "D3D3D3" } }
        };
      }
    }
    
    // Adicionar filtros automáticos
    worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    
    // Auto ajustar largura das colunas
    const cols: { wch: number }[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const address = XLSX.utils.encode_cell({ r: R, c: C });
        if (worksheet[address] && worksheet[address].v) {
          maxWidth = Math.max(maxWidth, String(worksheet[address].v).length);
        }
      }
      cols.push({ wch: Math.min(maxWidth + 2, 50) });
    }
    worksheet['!cols'] = cols;
    
    XLSX.utils.book_append_sheet(this.workbook, worksheet, sheetName);
    
    return this;
  }

  private createPivotData(
    sourceData: any[],
    config: PivotTableConfig
  ): any[] {
    // Agrupar dados pelos campos de linha e coluna
    const grouped = new Map<string, Map<string, any[]>>();
    
    sourceData.forEach(row => {
      const rowKey = config.rows.map(field => row[field]).join('|');
      const colKey = config.columns.map(field => row[field]).join('|');
      
      if (!grouped.has(rowKey)) {
        grouped.set(rowKey, new Map());
      }
      
      const rowGroup = grouped.get(rowKey)!;
      if (!rowGroup.has(colKey)) {
        rowGroup.set(colKey, []);
      }
      
      rowGroup.get(colKey)!.push(row);
    });
    
    // Construir tabela dinâmica
    const pivotRows: any[] = [];
    const allColumns = new Set<string>();
    
    // Coletar todas as colunas únicas
    grouped.forEach(rowGroup => {
      rowGroup.forEach((_, colKey) => {
        allColumns.add(colKey);
      });
    });
    
    const sortedColumns = Array.from(allColumns).sort();
    
    // Criar cabeçalho
    const header: any = {};
    config.rows.forEach(field => {
      header[field] = field;
    });
    
    sortedColumns.forEach(colKey => {
      config.values.forEach(valueConfig => {
        const columnName = colKey ? `${colKey}_${valueConfig.field}` : valueConfig.field;
        header[columnName] = columnName;
      });
    });
    
    // Processar cada grupo de linha
    grouped.forEach((rowGroup, rowKey) => {
      const rowData: any = {};
      const rowKeyParts = rowKey.split('|');
      
      config.rows.forEach((field, index) => {
        rowData[field] = rowKeyParts[index];
      });
      
      sortedColumns.forEach(colKey => {
        const items = rowGroup.get(colKey) || [];
        
        config.values.forEach(valueConfig => {
          const columnName = colKey ? `${colKey}_${valueConfig.field}` : valueConfig.field;
          
          switch (valueConfig.aggregation) {
            case 'sum':
              rowData[columnName] = formatNumber(
                items.reduce((sum, item) => sum + (Number(item[valueConfig.field]) || 0), 0)
              );
              break;
            case 'count':
              rowData[columnName] = items.length;
              break;
            case 'average':
              const sum = items.reduce((s, item) => 
                s + (Number(item[valueConfig.field]) || 0), 0);
              rowData[columnName] = items.length > 0 
                ? formatNumber(sum / items.length) 
                : 0;
              break;
            case 'min':
              rowData[columnName] = items.length > 0 
                ? formatNumber(Math.min(...items.map(item => Number(item[valueConfig.field]) || 0)))
                : 0;
              break;
            case 'max':
              rowData[columnName] = items.length > 0
                ? formatNumber(Math.max(...items.map(item => Number(item[valueConfig.field]) || 0)))
                : 0;
              break;
          }
        });
      });
      
      pivotRows.push(rowData);
    });
    
    return pivotRows;
  }

  addSummarySheet(sheetName: string, summaryData: {
    title: string;
    sections: {
      sectionTitle: string;
      metrics: { label: string; value: string | number }[];
    }[];
  }) {
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    let currentRow = 0;
    
    // Título principal
    XLSX.utils.sheet_add_aoa(worksheet, [[summaryData.title]], { origin: `A${currentRow + 1}` });
    worksheet['!merges'] = worksheet['!merges'] || [];
    worksheet['!merges'].push({
      s: { r: currentRow, c: 0 },
      e: { r: currentRow, c: 3 }
    });
    currentRow += 2;
    
    // Seções de métricas
    summaryData.sections.forEach(section => {
      // Título da seção
      XLSX.utils.sheet_add_aoa(worksheet, [[section.sectionTitle]], { origin: `A${currentRow + 1}` });
      worksheet['!merges'] = worksheet['!merges'] || [];
      worksheet['!merges'].push({
        s: { r: currentRow, c: 0 },
        e: { r: currentRow, c: 1 }
      });
      currentRow++;
      
      // Métricas (processar valores numéricos)
      section.metrics.forEach(metric => {
        const labelLower = metric.label.toLowerCase();
        const isPercentage = labelLower.includes('taxa') || labelLower.includes('porcentagem') || 
                             labelLower.includes('%') || labelLower.includes('percentual');
        const processedValue = parseNumericValue(metric.value, isPercentage);
        
        // Se for porcentagem e o valor é numérico, adicionar formato de porcentagem
        let displayValue = processedValue;
        if (isPercentage && typeof processedValue === 'number') {
          displayValue = `${processedValue}%`;
        }
        
        XLSX.utils.sheet_add_aoa(
          worksheet, 
          [[metric.label, displayValue]], 
          { origin: `A${currentRow + 1}` }
        );
        currentRow++;
      });
      
      currentRow++; // Linha em branco entre seções
    });
    
    // Aplicar estilos
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[address]) continue;
        
        // Estilos para títulos
        if (C === 0 && worksheet[address].v && typeof worksheet[address].v === 'string') {
          if (worksheet[address].v === summaryData.title || 
              summaryData.sections.some(s => s.sectionTitle === worksheet[address].v)) {
            worksheet[address].s = {
              font: { bold: true, size: C === 0 && R === 0 ? 16 : 14 },
              fill: { fgColor: { rgb: "E6EEF5" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
        }
      }
    }
    
    // Ajustar largura das colunas
    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 }
    ];
    
    XLSX.utils.book_append_sheet(this.workbook, worksheet, sheetName);
    
    return this;
  }

  download(filename: string) {
    // Configurar opções de escrita baseadas no locale
    const locale = detectLocale();
    const bookSST = true; // Compartilhar strings
    const bookType = 'xlsx';
    
    // Opções de escrita
    const writeOpts: XLSX.WritingOptions = {
      type: 'binary',
      bookSST,
      bookType,
      sheet: '',
      compression: false,
      Props: {
        Author: 'SwiftEDU',
        CreatedDate: new Date()
      }
    };
    
    XLSX.writeFile(this.workbook, filename, writeOpts);
  }

  getBuffer(): ArrayBuffer {
    return XLSX.write(this.workbook, { type: 'array', bookType: 'xlsx' });
  }

  getBase64(): string {
    return XLSX.write(this.workbook, { type: 'base64', bookType: 'xlsx' });
  }
}

// Funções utilitárias para exportação rápida
export function exportToExcel(
  data: any[],
  headers: string[],
  filename: string,
  sheetName: string = 'Dados'
) {
  const exporter = new ExcelExporter();
  
  const exportData: ExportData = {
    title: sheetName,
    headers,
    data: data.map(row => headers.map(header => {
      const value = row[header];
      // Processar valores numéricos automaticamente
      return parseNumericValue(value) || '';
    })),
    metadata: {
      date: new Date().toLocaleDateString('pt-BR'),
      user: 'Sistema SwiftEDU',
      locale: 'pt-BR'
    }
  };
  
  exporter.addDataSheet(sheetName, exportData);
  exporter.download(filename);
}

export function exportReportToExcel(
  reportData: {
    mainData: any[];
    headers: string[];
    pivotConfig?: PivotTableConfig;
    summary?: {
      title: string;
      sections: {
        sectionTitle: string;
        metrics: { label: string; value: string | number }[];
      }[];
    };
  },
  filename: string
) {
  const exporter = new ExcelExporter();
  
  // Adicionar dados principais
  const mainExportData: ExportData = {
    title: 'Relatório Detalhado',
    headers: reportData.headers,
    data: reportData.mainData.map(row => 
      reportData.headers.map(header => row[header] || '')
    ),
    metadata: {
      date: new Date().toLocaleDateString('pt-BR'),
      user: 'Sistema SwiftEDU',
      locale: 'pt-BR'
    }
  };
  
  exporter.addDataSheet('Dados Detalhados', mainExportData);
  
  // Adicionar tabela dinâmica se configurada
  if (reportData.pivotConfig) {
    exporter.addPivotTable(
      'Tabela Dinâmica',
      reportData.mainData,
      reportData.pivotConfig
    );
  }
  
  // Adicionar resumo se fornecido
  if (reportData.summary) {
    exporter.addSummarySheet('Resumo', reportData.summary);
  }
  
  exporter.download(filename);
}