import React from 'react'
import Image from 'next/image'

export default function Logo({
  className = "",
  width = 64,
  height = 64,
  showText = false
}: {
  className?: string;
  width?: number;
  height?: number;
  showText?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 select-none text-current ${className}`}>
      <div style={{ width: width, height: height }} className="relative">
        <Image
          src="/images/logo-bird-outline.png"
          alt="SwiftEDU Logo"
          width={width}
          height={height}
          className="object-contain"
          priority
        />
      </div>

      {showText && (
        <div className="flex flex-col justify-center">
          <span className="font-bold text-2xl tracking-tight leading-none font-heading text-current">
            SWIFT<span className="opacity-80">EDU</span>
          </span>
        </div>
      )}
    </div>
  )
}