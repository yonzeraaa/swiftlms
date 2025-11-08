import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock component inline
const ProgressBar = ({ progress, showLabel = true }: { progress: number; showLabel?: boolean }) => {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div data-testid="progress-bar" className="w-full">
      <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          data-testid="progress-fill"
          className="bg-blue-600 h-full transition-all"
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span data-testid="progress-label" className="text-sm text-gray-600 mt-1">
          {clampedProgress}% concluído
        </span>
      )}
    </div>
  )
}

describe('ProgressBar Component', () => {
  it('should render progress bar with correct width', () => {
    render(<ProgressBar progress={50} />)

    const fill = screen.getByTestId('progress-fill')
    expect(fill).toHaveStyle({ width: '50%' })
  })

  it('should show label by default', () => {
    render(<ProgressBar progress={75} />)

    expect(screen.getByTestId('progress-label')).toHaveTextContent('75% concluído')
  })

  it('should hide label when showLabel is false', () => {
    render(<ProgressBar progress={50} showLabel={false} />)

    expect(screen.queryByTestId('progress-label')).not.toBeInTheDocument()
  })

  it('should clamp progress to 0-100 range (handle > 100)', () => {
    render(<ProgressBar progress={150} />)

    const fill = screen.getByTestId('progress-fill')
    expect(fill).toHaveStyle({ width: '100%' })
    expect(fill).toHaveAttribute('aria-valuenow', '100')
  })

  it('should clamp progress to 0-100 range (handle < 0)', () => {
    render(<ProgressBar progress={-10} />)

    const fill = screen.getByTestId('progress-fill')
    expect(fill).toHaveStyle({ width: '0%' })
  })

  it('should have proper ARIA attributes', () => {
    render(<ProgressBar progress={60} />)

    const fill = screen.getByRole('progressbar')
    expect(fill).toHaveAttribute('aria-valuenow', '60')
    expect(fill).toHaveAttribute('aria-valuemin', '0')
    expect(fill).toHaveAttribute('aria-valuemax', '100')
  })
})
