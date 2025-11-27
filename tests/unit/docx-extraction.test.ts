import { describe, it, expect } from 'vitest'
import { extractTextFromXml } from '../../lib/docx-parser'

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
