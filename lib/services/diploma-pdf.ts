import 'server-only'

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import * as fs from 'fs'
import * as path from 'path'

const DIPLOMA_TEMPLATE_PATH = path.join(process.cwd(), 'public/templates/diploma-lato-sensu.pdf')

export interface DiplomaData {
  studentName: string
  courseName: string
  conclusionDate: string // formato dd/mm/yyyy
  courseHours: string
  grade: string
  issueDate: string // formato dd/mm/yyyy
  verificationUrl: string
}

interface TextPosition {
  x: number
  y: number
  size: number
  maxWidth?: number
}

// Posições dos campos no template (ajustar conforme necessário)
const FIELD_POSITIONS: Record<string, TextPosition> = {
  studentName: { x: 95, y: 395, size: 18, maxWidth: 400 },
  courseName: { x: 95, y: 340, size: 16, maxWidth: 400 },
  conclusionDate: { x: 190, y: 285, size: 14 },
  courseHours: { x: 390, y: 285, size: 14 },
  grade: { x: 150, y: 260, size: 14 },
  issueDate: { x: 205, y: 218, size: 14 },
}

const QR_POSITION = {
  x: 480,
  y: 60,
  size: 80,
}

export async function generateDiplomaPdf(data: DiplomaData): Promise<Uint8Array> {
  // Carregar o template PDF
  const templateBytes = fs.readFileSync(DIPLOMA_TEMPLATE_PATH)
  const pdfDoc = await PDFDocument.load(templateBytes)

  // Obter a primeira página
  const pages = pdfDoc.getPages()
  const firstPage = pages[0]

  // Carregar fonte com suporte a acentos
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const textColor = rgb(0.1, 0.1, 0.1)

  // Preencher nome do aluno
  firstPage.drawText(data.studentName, {
    x: FIELD_POSITIONS.studentName.x,
    y: FIELD_POSITIONS.studentName.y,
    size: FIELD_POSITIONS.studentName.size,
    font: fontBold,
    color: textColor,
    maxWidth: FIELD_POSITIONS.studentName.maxWidth,
  })

  // Preencher nome do curso
  firstPage.drawText(data.courseName, {
    x: FIELD_POSITIONS.courseName.x,
    y: FIELD_POSITIONS.courseName.y,
    size: FIELD_POSITIONS.courseName.size,
    font: fontBold,
    color: textColor,
    maxWidth: FIELD_POSITIONS.courseName.maxWidth,
  })

  // Preencher data de conclusão
  firstPage.drawText(data.conclusionDate, {
    x: FIELD_POSITIONS.conclusionDate.x,
    y: FIELD_POSITIONS.conclusionDate.y,
    size: FIELD_POSITIONS.conclusionDate.size,
    font: font,
    color: textColor,
  })

  // Preencher carga horária
  firstPage.drawText(data.courseHours, {
    x: FIELD_POSITIONS.courseHours.x,
    y: FIELD_POSITIONS.courseHours.y,
    size: FIELD_POSITIONS.courseHours.size,
    font: font,
    color: textColor,
  })

  // Preencher nota
  firstPage.drawText(data.grade, {
    x: FIELD_POSITIONS.grade.x,
    y: FIELD_POSITIONS.grade.y,
    size: FIELD_POSITIONS.grade.size,
    font: font,
    color: textColor,
  })

  // Preencher data de emissão
  firstPage.drawText(data.issueDate, {
    x: FIELD_POSITIONS.issueDate.x,
    y: FIELD_POSITIONS.issueDate.y,
    size: FIELD_POSITIONS.issueDate.size,
    font: font,
    color: textColor,
  })

  // Gerar QR Code
  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
    width: QR_POSITION.size * 2,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })

  // Converter data URL para bytes
  const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64')
  const qrImage = await pdfDoc.embedPng(qrImageBytes)

  // Inserir QR Code
  firstPage.drawImage(qrImage, {
    x: QR_POSITION.x,
    y: QR_POSITION.y,
    width: QR_POSITION.size,
    height: QR_POSITION.size,
  })

  // Salvar o PDF preenchido (flatten para evitar edição)
  const pdfBytes = await pdfDoc.save()

  return pdfBytes
}

export function formatDateBR(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatGrade(grade: number): string {
  return grade.toFixed(1).replace('.', ',')
}
