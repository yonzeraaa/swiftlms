'use client'

import { useEffect, useRef } from 'react'

interface MathFormulaProps {
  content: string
  inline?: boolean
  className?: string
}

export default function MathFormula({ content, inline = false, className = '' }: MathFormulaProps) {
  const elementRef = useRef<HTMLSpanElement | HTMLDivElement>(null)

  useEffect(() => {
    // Carregar MathJax dinamicamente se ainda não estiver carregado
    if (typeof window !== 'undefined' && !(window as any).MathJax) {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
      script.async = true
      script.onload = () => {
        (window as any).MathJax = {
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
    if ((window as any).MathJax && elementRef.current) {
      (window as any).MathJax.typesetPromise([elementRef.current]).catch((e: any) => {
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
    
    return processed
  }

  const Tag = inline ? 'span' : 'div'

  return (
    <Tag
      ref={elementRef as any}
      className={`math-content ${className}`}
      dangerouslySetInnerHTML={{ __html: processContent(content) }}
    />
  )
}