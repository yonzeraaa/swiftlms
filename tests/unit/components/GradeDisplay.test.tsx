import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock component inline para testes
const GradeDisplay = ({ grade, passingGrade = 7.0 }: { grade: number | null; passingGrade?: number }) => {
  if (grade === null) {
    return <span data-testid="grade-display">-</span>
  }

  const passed = grade >= passingGrade
  const colorClass = passed ? 'text-green-600' : 'text-red-600'

  return (
    <span
      data-testid="grade-display"
      className={colorClass}
      aria-label={passed ? 'Aprovado' : 'Reprovado'}
    >
      {grade.toFixed(1).replace('.', ',')}
    </span>
  )
}

describe('GradeDisplay Component', () => {
  it('should render formatted grade (8.5 as "8,5")', () => {
    render(<GradeDisplay grade={8.5} />)

    expect(screen.getByTestId('grade-display')).toHaveTextContent('8,5')
  })

  it('should show green color for passing grade (>= 7.0)', () => {
    render(<GradeDisplay grade={7.5} />)

    const element = screen.getByTestId('grade-display')
    expect(element).toHaveClass('text-green-600')
    expect(element).toHaveAttribute('aria-label', 'Aprovado')
  })

  it('should show red color for failing grade (< 7.0)', () => {
    render(<GradeDisplay grade={6.5} />)

    const element = screen.getByTestId('grade-display')
    expect(element).toHaveClass('text-red-600')
    expect(element).toHaveAttribute('aria-label', 'Reprovado')
  })

  it('should show "-" when grade is null', () => {
    render(<GradeDisplay grade={null} />)

    expect(screen.getByTestId('grade-display')).toHaveTextContent('-')
  })

  it('should handle exact passing grade (7.0)', () => {
    render(<GradeDisplay grade={7.0} />)

    const element = screen.getByTestId('grade-display')
    expect(element).toHaveClass('text-green-600')
  })

  it('should handle custom passing grade', () => {
    render(<GradeDisplay grade={8.0} passingGrade={9.0} />)

    const element = screen.getByTestId('grade-display')
    expect(element).toHaveClass('text-red-600')
  })
})
