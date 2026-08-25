import React, { createContext, useContext, useState, useEffect } from 'react';
import { AUTHORS } from '../data/blogData';

interface AvatarContextType {
  abuAsadAvatar: string;
  updateAbuAsadAvatar: (newAvatarDataUrlOrPath: string) => void;
  resetToDefault: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const STORAGE_KEY = 'smtrading_abu_asad_custom_avatar_raw';

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export const AvatarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [abuAsadAvatar, setAbuAsadAvatar] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return AUTHORS.abuAsad.avatar;
  });

  useEffect(() => {
    // If not in localStorage, check if /abu_asad_almansi.jpg exists in public
    const checkPublicImage = async () => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) {
          const res = await fetch('/abu_asad_almansi.jpg', { method: 'HEAD' });
          if (res.ok) {
            setAbuAsadAvatar('/abu_asad_almansi.jpg');
          }
        }
      } catch {
        // fallback
      }
    };
    checkPublicImage();
  }, []);

  const updateAbuAsadAvatar = (newAvatar: string) => {
    setAbuAsadAvatar(newAvatar);
    try {
      localStorage.setItem(STORAGE_KEY, newAvatar);
    } catch {
      // storage quota
    }
  };

  const resetToDefault = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setAbuAsadAvatar(AUTHORS.abuAsad.avatar);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    <AvatarContext.Provider value={{ abuAsadAvatar, updateAbuAsadAvatar, resetToDefault, handleFileUpload }}>
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
