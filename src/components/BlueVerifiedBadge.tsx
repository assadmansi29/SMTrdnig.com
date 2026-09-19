import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface BlueVerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  withTooltip?: boolean;
}

export const BlueVerifiedBadge: React.FC<BlueVerifiedBadgeProps> = ({ 
  size = 'sm', 
  className = '',
  withTooltip = true 
}) => {
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span 
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      title={withTooltip ? 'Verified Author: Abu Asad Almansi' : undefined}
    >
      <BadgeCheck 
        className={`${sizeMap[size]} text-white fill-[#1D9BF0] transition-transform hover:scale-110 drop-shadow-sm`} 
      />
    </span>
  );
};
