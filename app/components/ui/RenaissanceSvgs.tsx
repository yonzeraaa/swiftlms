import { CSSProperties } from 'react'

const ACCENT = '#8b6d22'

interface ClassicRuleProps {
  style?: CSSProperties
  color?: string
  className?: string
}

export function ClassicRule({ style, color = ACCENT, className = '' }: ClassicRuleProps) {
  return (
    <svg
      viewBox="0 0 300 14"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', display: 'block', color, ...style }}
    >
      <line x1="0" y1="7" x2="133" y2="7" stroke="currentColor" strokeWidth="0.7" opacity="0.35" />
      <line x1="167" y1="7" x2="300" y2="7" stroke="currentColor" strokeWidth="0.7" opacity="0.35" />
      <path d="M150,2 L155,7 L150,12 L145,7 Z" stroke="currentColor" strokeWidth="1.1" opacity="0.5" fill="none" />
      <circle cx="140" cy="7" r="1.3" fill="currentColor" opacity="0.35" />
      <circle cx="160" cy="7" r="1.3" fill="currentColor" opacity="0.35" />
    </svg>
  )
}

interface CornerBracketProps {
  style?: CSSProperties
  size?: number
  color?: string
  className?: string
}

// Renders a single L-shaped corner bracket. Use CSS transform to rotate for other corners.
export function CornerBracket({ style, size = 34, color = ACCENT, className = '' }: CornerBracketProps) {
  return (
    <svg
      viewBox="0 0 34 34"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size, display: 'block', ...style }}
    >
      <path d="M2,22 L2,2 L22,2" stroke={color} strokeWidth="1.5" opacity="0.4" />
    </svg>
  )
}

interface SwiftMarkProps {
  className?: string
  style?: CSSProperties
}

export function SwiftMark({ className = '', style }: SwiftMarkProps) {
  return (
    <svg
      viewBox="0 0 180 100"
      className={className}
      style={style}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M88,48 C78,37 57,25 14,27 C36,25 66,38 86,48 Z" />
      <path d="M88,48 C76,41 55,32 27,35 C46,32 68,41 86,48 Z" opacity="0.38" />
      <path d="M92,48 C102,37 123,25 166,27 C144,25 114,38 94,48 Z" />
      <path d="M92,48 C104,41 125,32 153,35 C134,32 112,41 94,48 Z" opacity="0.38" />
      <ellipse cx="90" cy="47" rx="6" ry="3.5" />
      <circle cx="90" cy="43" r="3" />
      <path
        d="M87,50 C84,59 79,69 73,75"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M93,50 C96,59 101,69 107,75"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
