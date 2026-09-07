import React, { createContext, useContext, useState, useEffect } from 'react';
import { AUTHORS } from '../data/blogData';
import { useAuth } from './AuthContext';

interface AvatarContextType {
  abuAsadAvatar: string;
  updateAbuAsadAvatar: (newAvatarDataUrlOrPath: string) => void;
  resetToDefault: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  canEditAbuAsadAvatar: boolean;
}

const STORAGE_KEY = 'smtrading_abu_asad_custom_avatar_raw';

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export const AvatarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  // Only the genuine Super Admin / Abu Asad account can ever modify the founder / administrator avatar
  const canEditAbuAsadAvatar = Boolean(
    user && 
    user.role === 'super_admin' && 
    (user.username?.toLowerCase() === 'abuasad' || user.id === 'user_abuasad')
  );

  const [abuAsadAvatar, setAbuAsadAvatar] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved.startsWith('data:image/')) return saved;
      // Clear any obsolete non-data string from previous versions
      if (saved) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
    return AUTHORS.abuAsad.avatar;
  });

  // If a regular user or unauthenticated guest is detected, purge any local browser storage injection
  useEffect(() => {
    if (!canEditAbuAsadAvatar) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setAbuAsadAvatar(AUTHORS.abuAsad.avatar);
    }
  }, [canEditAbuAsadAvatar]);

  const updateAbuAsadAvatar = (newAvatar: string) => {
    if (!canEditAbuAsadAvatar) {
      console.warn('[Authorization Guard] Access denied: Regular users are prohibited from altering administrator or founder avatars.');
      return;
    }
    setAbuAsadAvatar(newAvatar);
    try {
      localStorage.setItem(STORAGE_KEY, newAvatar);
    } catch {
      // storage quota
    }
  };

  const resetToDefault = () => {
    if (!canEditAbuAsadAvatar) {
      console.warn('[Authorization Guard] Access denied: Regular users are prohibited from altering administrator or founder avatars.');
      return;
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setAbuAsadAvatar(AUTHORS.abuAsad.avatar);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditAbuAsadAvatar) {
      console.warn('[Authorization Guard] Access denied: Regular users are prohibited from altering administrator or founder avatars.');
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          updateAbuAsadAvatar(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <AvatarContext.Provider value={{ abuAsadAvatar, updateAbuAsadAvatar, resetToDefault, handleFileUpload, canEditAbuAsadAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
};

export const useAbuAsadAvatar = () => {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error('useAbuAsadAvatar must be used within an AvatarProvider');
  }
  return context;
};
