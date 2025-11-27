import { describe, it, expect, vi } from 'vitest'
import { extractTextFromXml, extractPlaceholdersFromBuffer } from '../../lib/docx-parser'
import PizZip from 'pizzip'

// Helper para criar um buffer ZIP mockado com conteúdo XML
function createMockDocxBuffer(files: Record<string, string>): Buffer {
  const zip = new PizZip()
  Object.entries(files).forEach(([path, content]) => {
    zip.file(path, content)
  })
  return zip.generate({ type: 'nodebuffer' }) as Buffer
}

describe('Docx Parser - XML Extraction', () => {
  it('should extract simple text from a paragraph', () => {
    const xml = `
      <w:p>
        <w:r><w:t>Hello World</w:t></w:r>
      </w:p>
    `
    expect(extractTextFromXml(xml)).toBe('Hello World')
  })

  it('should join multiple runs in a single paragraph', () => {
    const xml = `
      <w:p>
        <w:r><w:t>Hello</w:t></w:r>
        <w:r><w:t> </w:t></w:r>
        <w:r><w:t>World</w:t></w:r>
      </w:p>
    `
    expect(extractTextFromXml(xml)).toBe('Hello World')
  })

  it('should handle placeholders broken across runs', () => {
    // This simulates {{student.name}} broken into "{{", "student", ".", "name", "}}"
    const xml = `
      <w:p>
        <w:r><w:t>{{</w:t></w:r>
        <w:r><w:t>student</w:t></w:r>
        <w:r><w:t>.</w:t></w:r>
        <w:r><w:t>name</w:t></w:r>
        <w:r><w:t>}}</w:t></w:r>
      </w:p>
    `
    expect(extractTextFromXml(xml)).toBe('{{student.name}}')
  })

  it('should separate paragraphs with newlines', () => {
    const xml = `
      <w:p><w:t>Paragraph 1</w:t></w:p>
      <w:p><w:t>Paragraph 2</w:t></w:p>
    `
    expect(extractTextFromXml(xml)).toBe('Paragraph 1\nParagraph 2')
  })

  it('should ignore other XML tags inside paragraphs', () => {
    const xml = `
      <w:p>
        <w:rPr><w:b/></w:rPr>
        <w:t>Bold Text</w:t>
      </w:p>
    `
    expect(extractTextFromXml(xml)).toBe('Bold Text')
  })
})

describe('Docx Parser - extractPlaceholdersFromBuffer', () => {
  it('should extract placeholders from document body', () => {
    const docXml = `
      <w:document>
        <w:body>
          <w:p><w:r><w:t>{{student.full_name}}</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `
    const buffer = createMockDocxBuffer({ 'word/document.xml': docXml })
    const result = extractPlaceholdersFromBuffer(buffer)

    expect(result.placeholders).toHaveLength(1)
    expect(result.placeholders[0].name).toBe('student.full_name')
    expect(result.placeholders[0].location).toBe('body')
  })

  it('should extract placeholders from header', () => {
    const headerXml = `
      <w:hdr>
        <w:p><w:r><w:t>{{institution.name}}</w:t></w:r></w:p>
      </w:hdr>
    `
    const buffer = createMockDocxBuffer({
      'word/document.xml': '<w:document><w:body></w:body></w:document>',
      'word/header1.xml': headerXml
    })
    const result = extractPlaceholdersFromBuffer(buffer)

    expect(result.placeholders).toHaveLength(1)
    expect(result.placeholders[0].name).toBe('institution.name')
    expect(result.placeholders[0].location).toBe('header')
  })

  it('should extract placeholders from footer', () => {
    const footerXml = `
      <w:ftr>
        <w:p><w:r><w:t>{{certificate.verification_code}}</w:t></w:r></w:p>
      </w:ftr>
    `
    const buffer = createMockDocxBuffer({
      'word/document.xml': '<w:document><w:body></w:body></w:document>',
      'word/footer1.xml': footerXml
    })
    const result = extractPlaceholdersFromBuffer(buffer)

    expect(result.placeholders).toHaveLength(1)
    expect(result.placeholders[0].name).toBe('certificate.verification_code')
    expect(result.placeholders[0].location).toBe('footer')
  })

  it('should track multiple locations for the same placeholder', () => {
    const docXml = `
      <w:document>
        <w:body>
          <w:p><w:r><w:t>{{student.full_name}}</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `
    const headerXml = `
      <w:hdr>
        <w:p><w:r><w:t>{{student.full_name}}</w:t></w:r></w:p>
      </w:hdr>
    `
    const buffer = createMockDocxBuffer({
      'word/document.xml': docXml,
      'word/header1.xml': headerXml
    })
    const result = extractPlaceholdersFromBuffer(buffer)

    expect(result.placeholders).toHaveLength(1)
    expect(result.placeholders[0].occurrenceCount).toBe(2)
    expect(result.placeholders[0].locations).toHaveLength(2)
    expect(result.placeholders[0].locations).toContainEqual({ location: 'body', count: 1 })
    expect(result.placeholders[0].locations).toContainEqual({ location: 'header', count: 1 })
  })

  it('should count multiple occurrences in same location', () => {
    const docXml = `
      <w:document>
        <w:body>
          <w:p><w:r><w:t>{{student.full_name}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>Name: {{student.full_name}}</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `
    const buffer = createMockDocxBuffer({ 'word/document.xml': docXml })
    const result = extractPlaceholdersFromBuffer(buffer)

    expect(result.placeholders).toHaveLength(1)
    expect(result.placeholders[0].occurrenceCount).toBe(2)
    expect(result.placeholders[0].locations).toContainEqual({ location: 'body', count: 2 })
  })

  it('should handle placeholders broken across multiple runs', () => {
    const docXml = `
      <w:document>
        <w:body>
          <w:p>
            <w:r><w:t>{{</w:t></w:r>
            <w:r><w:t>student</w:t></w:r>
            <w:r><w:t>.</w:t></w:r>
            <w:r><w:t>full_name</w:t></w:r>
            <w:r><w:t>}}</w:t></w:r>
          </w:p>
        </w:body>
      </w:document>
    `
    const buffer = createMockDocxBuffer({ 'word/document.xml': docXml })
    const result = extractPlaceholdersFromBuffer(buffer)

    expect(result.placeholders).toHaveLength(1)
    expect(result.placeholders[0].name).toBe('student.full_name')
  })

  it('should detect format transformations', () => {
    const docXml = `
      <w:document>
        <w:body>
          <w:p><w:r><w:t>{{uppercase student.full_name}}</w:t></w:r></w:p>
          <w:p><w:r><w:t>{{date-long certificate.issue_date}}</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `
    const buffer = createMockDocxBuffer({ 'word/document.xml': docXml })
    const result = extractPlaceholdersFromBuffer(buffer)

    expect(result.placeholders).toHaveLength(2)

    const nameField = result.placeholders.find(p => p.name === 'student.full_name')
    expect(nameField?.format).toBe('uppercase')

    const dateField = result.placeholders.find(p => p.name === 'certificate.issue_date')
    expect(dateField?.format).toBe('date-long')
  })

  it('should ignore handlebars conditionals', () => {
    const docXml = `
      <w:document>
        <w:body>
          <w:p><w:r><w:t>{{#if grade}}Grade: {{certificate.grade}}{{/if}}</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `
    const buffer = createMockDocxBuffer({ 'word/document.xml': docXml })
    const result = extractPlaceholdersFromBuffer(buffer)

    expect(result.placeholders).toHaveLength(1)
    expect(result.placeholders[0].name).toBe('certificate.grade')
  })

  it('should warn about unknown fields with location info', () => {
    const docXml = `
      <w:document>
        <w:body>
          <w:p><w:r><w:t>{{custom.unknown_field}}</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `
    const buffer = createMockDocxBuffer({ 'word/document.xml': docXml })
    const result = extractPlaceholdersFromBuffer(buffer)

    expect(result.warnings.some(w => w.includes('custom.unknown_field'))).toBe(true)
    expect(result.warnings.some(w => w.includes('body'))).toBe(true)
  })

  it('should warn about missing required fields', () => {
    const docXml = `
      <w:document>
        <w:body>
          <w:p><w:r><w:t>{{student.email}}</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `
    const buffer = createMockDocxBuffer({ 'word/document.xml': docXml })
    const result = extractPlaceholdersFromBuffer(buffer)

    // Deve avisar sobre campos obrigatórios não encontrados
    expect(result.warnings.some(w => w.includes('student.full_name'))).toBe(true)
    expect(result.warnings.some(w => w.includes('course.title'))).toBe(true)
    expect(result.warnings.some(w => w.includes('obrigatório'))).toBe(true)
  })

  it('should warn about date format on non-date fields', () => {
    const docXml = `
      <w:document>
        <w:body>
          <w:p><w:r><w:t>{{date-short student.full_name}}</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `
    const buffer = createMockDocxBuffer({ 'word/document.xml': docXml })
    const result = extractPlaceholdersFromBuffer(buffer)

    expect(result.warnings.some(w =>
      w.includes('date-short') && w.includes('student.full_name') && w.includes('não é do tipo date')
    )).toBe(true)
  })

  it('should normalize whitespace in placeholders', () => {
    const docXml = `
      <w:document>
        <w:body>
          <w:p><w:r><w:t>{{  uppercase   student.full_name  }}</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `
    const buffer = createMockDocxBuffer({ 'word/document.xml': docXml })
    const result = extractPlaceholdersFromBuffer(buffer)

    expect(result.placeholders).toHaveLength(1)
    expect(result.placeholders[0].name).toBe('student.full_name')
    expect(result.placeholders[0].format).toBe('uppercase')
  })

  it('should mark known fields as required correctly', () => {
    const docXml = `
      <w:document>
        <w:body>
          <w:p><w:r><w:t>{{student.full_name}} {{student.email}}</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `
    const buffer = createMockDocxBuffer({ 'word/document.xml': docXml })
    const result = extractPlaceholdersFromBuffer(buffer)

    const requiredField = result.placeholders.find(p => p.name === 'student.full_name')
    const optionalField = result.placeholders.find(p => p.name === 'student.email')

    expect(requiredField?.required).toBe(true)
    expect(optionalField?.required).toBe(false)
  })

  it('should handle empty document gracefully', () => {
    const docXml = `
      <w:document>
        <w:body></w:body>
      </w:document>
    `
    const buffer = createMockDocxBuffer({ 'word/document.xml': docXml })
    const result = extractPlaceholdersFromBuffer(buffer)

    expect(result.placeholders).toHaveLength(0)
    // Deve ter avisos sobre campos obrigatórios faltando
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
