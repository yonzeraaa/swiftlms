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
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/images/swiftbg.png"
        alt="SwiftEDU Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
      {showText && (
        <span className="font-bold text-xl text-[#EA6D2C]">
          SWIFTEDU
        </span>
      )}
    </div>
  )
}