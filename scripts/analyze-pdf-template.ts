/**
 * Script para analisar a estrutura do template PDF
 */

import { PDFDocument } from 'pdf-lib'
import * as fs from 'fs'
import * as path from 'path'

async function analyzePdfTemplate() {
  const templatePath = path.join(process.cwd(), 'public/templates/diploma-lato-sensu.pdf')
  const templateBytes = fs.readFileSync(templatePath)
  const pdfDoc = await PDFDocument.load(templateBytes)

  console.log('📄 Análise do Template PDF\n')
  console.log('=' .repeat(50))

  // Informações básicas
  const pages = pdfDoc.getPages()
  console.log(`📑 Número de páginas: ${pages.length}`)

  const firstPage = pages[0]
  const { width, height } = firstPage.getSize()
  console.log(`📐 Dimensões: ${width.toFixed(0)} x ${height.toFixed(0)} pontos`)
  console.log(`   (${(width / 72).toFixed(2)}" x ${(height / 72).toFixed(2)}")`)

  // Verificar campos de formulário
  const form = pdfDoc.getForm()
  const fields = form.getFields()

  console.log(`\n📝 Campos de formulário encontrados: ${fields.length}`)

  if (fields.length > 0) {
    console.log('\nCampos:')
    fields.forEach((field, index) => {
      console.log(`  ${index + 1}. "${field.getName()}" - Tipo: ${field.constructor.name}`)
    })
  } else {
    console.log('\n⚠️  O PDF NÃO possui campos de formulário editáveis.')
    console.log('   Os dados do template são imagens/texto estático.')
    console.log('\n💡 Sugestão: Você precisa de um template PDF em branco')
    console.log('   (sem os dados de exemplo preenchidos) para que o')
    console.log('   sistema possa preencher os campos corretamente.')
  }

  console.log('\n' + '=' .repeat(50))
}

analyzePdfTemplate().catch(console.error)
