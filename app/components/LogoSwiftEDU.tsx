export default function LogoSwiftEDU({ 
  className = "", 
  size = "md",
  showText = true 
}: { 
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl"
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <svg
          className={sizeClasses[size]}
          viewBox="0 0 200 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Beija-flor */}
          <g transform="translate(30, 60)">
            {/* Corpo do beija-flor */}
            <ellipse 
              cx="20" 
              cy="0" 
              rx="25" 
              ry="12" 
              fill="#FFD700"
              transform="rotate(-10)"
            />
            
            {/* Cabeça */}
            <ellipse cx="5" cy="-3" r="10" fill="#FFD700" />
            
            {/* Bico */}
            <path 
              d="M-5 -3 L-20 -4 L-20 -2 Z"
              fill="#FFD700"
            />
            
            {/* Olho */}
            <circle cx="3" cy="-4" r="2" fill="white" />
            <circle cx="3" cy="-4" r="1" fill="black" />
            
            {/* Asa superior */}
            <path 
              d="M15 -5 Q5 -20 -15 -25 Q-5 -22 5 -15 Q10 -10 15 -5"
              fill="#FFD700"
              opacity="0.9"
            />
            
            {/* Asa do meio */}
            <path 
              d="M15 0 Q0 -12 -20 -10 Q-10 -10 0 -8 Q10 -5 15 0"
              fill="#FFD700"
              opacity="0.8"
            />
            
            {/* Asa inferior */}
            <path 
              d="M15 5 Q5 10 -10 15 Q0 10 10 5 Q12 3 15 5"
              fill="#FFD700"
              opacity="0.7"
            />
            
            {/* Cauda */}
            <path 
              d="M40 0 L50 -8 L48 -3 L45 0 L48 3 L50 8 L40 0"
              fill="#FFD700"
            />
          </g>
          
          {/* Monitor */}
          <g transform="translate(90, 30)">
            {/* Moldura do monitor */}
            <rect 
              x="0" 
              y="0" 
              width="80" 
              height="50" 
              rx="5" 
              fill="#FFD700"
            />
            
            {/* Tela */}
            <rect 
              x="5" 
              y="5" 
              width="70" 
              height="40" 
              rx="2" 
              fill="white"
            />
            
            {/* Livro no monitor */}
            <g transform="translate(40, 25)">
              {/* Página esquerda */}
              <path 
                d="M-15 -10 L-15 10 L0 10 L0 -10 Z" 
                fill="#FFD700"
              />
              {/* Página direita */}
              <path 
                d="M0 -10 L15 -10 L15 10 L0 10 Z" 
                fill="#FFD700"
                opacity="0.8"
              />
              {/* Lombada */}
              <rect x="-1" y="-10" width="2" height="20" fill="#FFD700" />
            </g>
            
            {/* Base do monitor */}
            <rect x="35" y="50" width="10" height="8" fill="#FFD700" />
            {/* Suporte do monitor */}
            <path d="M25 58 L55 58 L50 62 L30 62 Z" fill="#FFD700" />
          </g>
        </svg>
      </div>
      
      {showText && (
        <span className={`font-bold ${textSizes[size]} text-gold-500 tracking-wider`}>
          SWIFTEDU
        </span>
      )}
    </div>
  );
}