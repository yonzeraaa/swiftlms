const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
    console.log('Iniciando geração do PDF...');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Carregar o HTML
        const htmlPath = path.join(__dirname, 'manual-usuario.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // Definir o conteúdo da página
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });
        
        // Adicionar CSS inline para melhor renderização no PDF
        await page.addStyleTag({
            path: path.join(__dirname, 'manual-styles.css')
        });
        
        // Configurações do PDF
        const pdfPath = path.join(__dirname, 'manual-usuario.pdf');
        
        console.log('Gerando PDF...');
        
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: `
                <div style="width: 100%; font-size: 10px; padding: 20px 50px 0; color: #666;">
                    <div style="float: left;">SwiftLMS - Manual do Usuário</div>
                    <div style="float: right;">Versão 1.0</div>
                </div>
            `,
            footerTemplate: `
                <div style="width: 100%; font-size: 10px; padding: 0 50px 20px; color: #666;">
                    <div style="text-align: center;">
                        Página <span class="pageNumber"></span> de <span class="totalPages"></span>
                    </div>
                </div>
            `,
            margin: {
                top: '80px',
                bottom: '80px',
                left: '50px',
                right: '50px'
            },
            preferCSSPageSize: true
        });
        
        console.log(`✅ PDF gerado com sucesso: ${pdfPath}`);
        console.log(`📄 Tamanho do arquivo: ${(fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2)} MB`);
        
    } catch (error) {
        console.error('❌ Erro ao gerar PDF:', error);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

// Executar a geração
generatePDF().catch(console.error);