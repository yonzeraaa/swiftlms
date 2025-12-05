/**
 * Script para testar a geração de diploma lato-sensu localmente
 *
 * Uso: npx tsx scripts/test-diploma-generation.ts
 */

import { PDFDocument } from 'pdf-lib'
import QRCode from 'qrcode'
import * as fs from 'fs'
import * as path from 'path'

const DIPLOMA_TEMPLATE_PATH = path.join(process.cwd(), 'public/templates/diploma-lato-sensu.pdf')

interface DiplomaData {
  studentName: string
  courseName: string
  conclusionDate: string
  courseHours: string
  grade: string
  issueDate: string
  verificationUrl: string
}

const FORM_FIELD_MAPPING = {
  studentName: 'Text1',
  courseName: 'Text2',
  conclusionDate: 'Text3',
  courseHours: 'Text4',
  grade: 'Text5',
  issueDate: 'Text6',
}

const QR_POSITION = {
  x: 245,
  y: 28,
  size: 70,
}

function formatDateBR(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatGrade(grade: number): string {
  return grade.toFixed(1).replace('.', ',')
}

async function generateDiplomaPdf(data: DiplomaData): Promise<Uint8Array> {
  const templateBytes = fs.readFileSync(DIPLOMA_TEMPLATE_PATH)
  const pdfDoc = await PDFDocument.load(templateBytes)

  // Obter o formulário do PDF
  const form = pdfDoc.getForm()

  // Preencher os campos do formulário
  const text1 = form.getTextField(FORM_FIELD_MAPPING.studentName)
  text1.setText(data.studentName)

  const text2 = form.getTextField(FORM_FIELD_MAPPING.courseName)
  text2.setText(data.courseName)

  const text3 = form.getTextField(FORM_FIELD_MAPPING.conclusionDate)
  text3.setText(data.conclusionDate)

  const text4 = form.getTextField(FORM_FIELD_MAPPING.courseHours)
  text4.setText(data.courseHours)

  const text5 = form.getTextField(FORM_FIELD_MAPPING.grade)
  text5.setText(data.grade)

  const text6 = form.getTextField(FORM_FIELD_MAPPING.issueDate)
  text6.setText(data.issueDate)

  // Gerar QR Code
  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
    width: QR_POSITION.size * 2,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })

  const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64')
  const qrImage = await pdfDoc.embedPng(qrImageBytes)

  const pages = pdfDoc.getPages()
  const firstPage = pages[0]

  firstPage.drawImage(qrImage, {
    x: QR_POSITION.x,
    y: QR_POSITION.y,
    width: QR_POSITION.size,
    height: QR_POSITION.size,
  })

  // Flatten o formulário para tornar os campos não editáveis
  form.flatten()

  return await pdfDoc.save()
}

async function testDiplomaGeneration() {
  console.log('🎓 Testando geração de diploma lato-sensu...\n')

  const testData = {
    studentName: 'João da Silva Santos',
    courseName: 'Engenharia de Software',
    conclusionDate: formatDateBR(new Date('2025-12-02')),
    courseHours: '360',
    grade: formatGrade(9.5),
    issueDate: formatDateBR(new Date()),
    verificationUrl: 'https://swiftlms.vercel.app/certificados/ABC12345',
  }

  console.log('📝 Dados de teste:')
  console.log(JSON.stringify(testData, null, 2))
  console.log('')

  try {
    console.log('⏳ Gerando PDF usando campos de formulário...')
    const pdfBytes = await generateDiplomaPdf(testData)

    const outputPath = path.join(process.cwd(), 'test-diploma-output.pdf')
    fs.writeFileSync(outputPath, pdfBytes)

    console.log(`✅ PDF gerado com sucesso!`)
    console.log(`📄 Arquivo salvo em: ${outputPath}`)
    console.log(`📊 Tamanho: ${(pdfBytes.length / 1024).toFixed(2)} KB`)
    console.log('')
    console.log('🔍 Abra o arquivo para verificar se os campos foram preenchidos corretamente.')
  } catch (error) {
    console.error('❌ Erro ao gerar diploma:', error)
    process.exit(1)
  }
}

testDiplomaGeneration()
