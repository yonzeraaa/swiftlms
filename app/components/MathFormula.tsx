'use client'

import { useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'

interface MathFormulaProps {
  content: string
  inline?: boolean
  className?: string
}

interface MathJaxConfig {
  tex: {
    inlineMath: string[][]
    displayMath: string[][]
    processEscapes: boolean
  }
  svg: {
    fontCache: string
  }
}

export default function MathFormula({ content, inline = false, className = '' }: MathFormulaProps) {
  const elementRef = useRef<HTMLSpanElement | HTMLDivElement>(null)

  useEffect(() => {
    // Carregar MathJax dinamicamente se ainda não estiver carregado
    const windowWithMathJax = window as Window & { MathJax?: MathJaxConfig }
    
    if (typeof window !== 'undefined' && !windowWithMathJax.MathJax) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
      script.async = true
      script.onload = () => {
        windowWithMathJax.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath: [['$$', '$$'], ['\\[', '\\]']],
            processEscapes: true
          },
          svg: {
            fontCache: 'global'
          }
        }
        renderMath()
      }
      document.head.appendChild(script)
    } else {
      renderMath()
    }
  }, [content])

  const renderMath = () => {
    const windowWithMathJax = window as Window & { 
      MathJax?: { 
        typesetPromise: (elements: Element[]) => Promise<void> 
      } 
    }
    
    if (windowWithMathJax.MathJax && elementRef.current) {
      windowWithMathJax.MathJax.typesetPromise([elementRef.current]).catch((e: Error) => {
        console.error('MathJax rendering error:', e)
      })
    }
  }

  // Processar o conteúdo para detectar e renderizar fórmulas
  const processContent = (text: string) => {
    // Substituir delimitadores LaTeX comuns para MathJax
    let processed = text
      .replace(/\\\[/g, '$$')
      .replace(/\\\]/g, '$$')
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$')
    
    // Sanitizar HTML para prevenir XSS, mantendo apenas tags matemáticas seguras
    const sanitized = DOMPurify.sanitize(processed, {
      ALLOWED_TAGS: ['span', 'div', 'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mroot', 'msqrt'],
      ALLOWED_ATTR: ['class', 'id'],
      KEEP_CONTENT: true
    })
    
    return sanitized
  }

  const Tag = inline ? 'span' : 'div'

  return (
    <Tag
      ref={elementRef as React.RefObject<HTMLSpanElement> & React.RefObject<HTMLDivElement>}
      className={`math-content ${className}`}
      dangerouslySetInnerHTML={{ __html: processContent(content) }}
    />
  )
}