import React, { useState } from 'react';
import { Crown, ShieldCheck, Camera, User as UserIcon } from 'lucide-react';
import { UserProfile, UserRole } from '../types';

export interface UserAvatarProps {
  user?: Partial<UserProfile> | {
    username?: string;
    fullName?: string;
    role?: UserRole | string;
    avatarUrl?: string;
  } | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  showRoleBadge?: boolean;
  isEditable?: boolean;
  onEditClick?: () => void;
  alt?: string;
}

const sizeClasses = {
  xs: 'w-4 h-4 text-[9px] rounded-md',
  sm: 'w-5 h-5 text-[10px] rounded-md',
  md: 'w-8 h-8 text-xs rounded-lg',
  lg: 'w-10 h-10 text-sm rounded-xl',
  xl: 'w-14 h-14 text-base rounded-2xl',
  '2xl': 'w-20 h-20 text-xl rounded-2xl',
  '3xl': 'w-24 h-24 text-2xl rounded-2xl',
};

const badgeSizeClasses = {
  xs: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5 p-0.5',
  sm: 'w-3 h-3 -bottom-0.5 -right-0.5 p-0.5',
  md: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5 p-0.5',
  lg: 'w-4 h-4 -bottom-1 -right-1 p-0.5',
  xl: 'w-5 h-5 -bottom-1 -right-1 p-1',
  '2xl': 'w-6 h-6 -bottom-1.5 -right-1.5 p-1',
  '3xl': 'w-7 h-7 -bottom-1.5 -right-1.5 p-1.5',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showRoleBadge = false,
  isEditable = false,
  onEditClick,
  alt,
}) => {
  const [imageError, setImageError] = useState(false);

  const username = user?.username || 'user';
  const role = user?.role || 'client';
  const avatarUrl = user?.avatarUrl?.trim();
  const displayName = user?.fullName || username;

  // Determine initial fallback letter
  const initial = (displayName.charAt(0) || username.charAt(0) || 'U').toUpperCase();

  // Resolve source URL
  let resolvedSrc: string | null = null;

  if (avatarUrl && !imageError) {
    resolvedSrc = avatarUrl;
  } else if (!imageError) {
    if (role === 'admin') {
      resolvedSrc = '/abu_asad_almansi.jpg';
    } else {
      resolvedSrc = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
    }
  }

  const baseSizeClass = sizeClasses[size] || sizeClasses.md;
  const badgeClass = badgeSizeClasses[size] || badgeSizeClasses.md;

  return (
    <div className={`relative inline-block shrink-0 select-none ${className}`}>
      <div
        className={`relative overflow-hidden flex items-center justify-center font-bold font-mono transition-transform bg-slate-900 border border-slate-700/80 shadow-inner ${baseSizeClass} ${
          isEditable ? 'cursor-pointer group' : ''
        }`}
        onClick={isEditable ? onEditClick : undefined}
      >
        {resolvedSrc && !imageError ? (
          <img
            src={resolvedSrc}
            alt={alt || displayName}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover rounded-[inherit] transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600/30 via-slate-800 to-slate-900 text-amber-300 font-extrabold uppercase">
            {initial || <UserIcon className="w-1/2 h-1/2 text-slate-400" />}
          </div>
        )}

        {/* Hover / Tap Edit Overlay */}
        {isEditable && (
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-amber-400"
            title="Upload new profile picture"
          >
            <Camera className="w-1/3 h-1/3 min-w-3.5 min-h-3.5 text-amber-300 drop-shadow" />
            {(size === '2xl' || size === '3xl') && (
              <span className="text-[10px] font-sans font-bold text-white mt-1 drop-shadow">
                Change
              </span>
            )}
          </div>
        )}
      </div>

      {/* Role Badge Indicator */}
      {showRoleBadge && role === 'admin' && (
        <div
          className={`absolute rounded-full bg-amber-500 text-slate-950 border border-amber-300 flex items-center justify-center shadow-md ${badgeClass}`}
          title="Master Admin"
        >
          <Crown className="w-full h-full" />
        </div>
      )}

      {showRoleBadge && role === 'employee' && (
        <div
          className={`absolute rounded-full bg-blue-500 text-white border border-blue-300 flex items-center justify-center shadow-md ${badgeClass}`}
          title="Staff Member"
        >
          <ShieldCheck className="w-full h-full" />
        </div>
      )}
    </div>
  );
};
