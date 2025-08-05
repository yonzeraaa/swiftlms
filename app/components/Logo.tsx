export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-16 h-16 ${className}`}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#003366" />
          <stop offset="100%" stopColor="#001f3f" />
        </linearGradient>
      </defs>
      
      {/* Ondas do mar */}
      <g className="animate-pulse">
        <path
          d="M8 40 Q16 36 24 40 T40 40 T56 40 L56 56 L8 56 Z"
          fill="url(#waveGradient)"
          opacity="0.6"
        />
        <path
          d="M8 44 Q16 40 24 44 T40 44 T56 44 L56 56 L8 56 Z"
          fill="url(#waveGradient)"
          opacity="0.8"
        />
      </g>
      
      {/* Casco do navio */}
      <g>
        <path
          d="M16 38 L48 38 L44 46 L20 46 Z"
          fill="url(#logoGradient)"
          stroke="#FFD700"
          strokeWidth="1"
        />
        
        {/* Superestrutura do navio */}
        <rect x="24" y="32" width="16" height="6" fill="#FFD700" rx="1" />
        <rect x="28" y="28" width="8" height="4" fill="#FFA500" rx="1" />
        
        {/* Chaminé */}
        <rect x="30" y="24" width="4" height="4" fill="#FF8C00" />
      </g>
      
      {/* Plataforma Offshore */}
      <g opacity="0.7">
        {/* Torre */}
        <line x1="44" y1="20" x2="44" y2="38" stroke="#FFD700" strokeWidth="1.5" />
        <line x1="48" y1="20" x2="48" y2="38" stroke="#FFD700" strokeWidth="1.5" />
        {/* Cruzamentos */}
        <line x1="44" y1="25" x2="48" y2="29" stroke="#FFD700" strokeWidth="1" />
        <line x1="48" y1="25" x2="44" y2="29" stroke="#FFD700" strokeWidth="1" />
        {/* Plataforma superior */}
        <rect x="42" y="18" width="8" height="3" fill="#FFD700" rx="0.5" />
        {/* Guindaste */}
        <line x1="46" y1="18" x2="46" y2="14" stroke="#FFA500" strokeWidth="1" />
        <line x1="46" y1="14" x2="50" y2="16" stroke="#FFA500" strokeWidth="1" />
      </g>
      
    </svg>
  )
}