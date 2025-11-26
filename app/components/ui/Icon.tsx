import { LucideIcon } from 'lucide-react';

interface IconProps {
  icon: LucideIcon;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Icon({ icon: IconComponent, size = 'md', className = '' }: IconProps) {
  const sizeMap = {
    xs: 14,
    sm: 16, 
    md: 20,
    lg: 24,
    xl: 32
  };

  return (
    <IconComponent 
      size={sizeMap[size]} 
      strokeWidth={1.5}
      className={`text-current ${className}`}
    />
  );
}