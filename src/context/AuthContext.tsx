import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  sendRegisterVerificationCode: (email: string, username?: string) => Promise<{ success: boolean; error?: string; message?: string; code?: string }>;
  register: (data: { username: string; email: string; password: string; fullName?: string; referralCode?: string; plan?: string; verificationCode: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  activateSubscription: (durationMonths: number, planName?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  sendProfileVerificationCode: (targetEmail?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  updateProfile: (data: { fullName?: string; email?: string; phone?: string; avatarUrl?: string; username?: string; verificationCode?: string }) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  uploadAvatar: (avatarData: string) => Promise<{ success: boolean; avatarUrl?: string; error?: string; message?: string }>;
  removeAvatar: () => Promise<{ success: boolean; error?: string; message?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('smtrading_token');
      if (!stored || stored === 'null' || stored === 'undefined' || stored.trim() === '') {
        return null;
      }
      return stored.trim();
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const retryCountRef = useRef<number>(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  const fetchCurrentUser = useCallback(async (authToken?: string | null) => {
    const rawToken = authToken !== undefined ? authToken : token;
    const cleanToken = (rawToken && typeof rawToken === 'string' && rawToken !== 'null' && rawToken !== 'undefined' && rawToken.trim() !== '')
      ? rawToken.trim()
      : null;

    if (!cleanToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        retryCountRef.current = 0;
      } else if (res.status === 401 || res.status === 403) {
        // Token is genuinely expired, revoked, or invalid
        try {
          localStorage.removeItem('smtrading_token');
        } catch {}
        setToken(null);
        setUser(null);
        retryCountRef.current = 0;
      } else {
        // Temporary server or database status (e.g. 503 DATABASE_UNAVAILABLE, 502, 504)
        console.warn(`[AuthContext] Server temporarily unavailable (status ${res.status}). Preserving authentication state.`);
        if (retryCountRef.current < 2) {
          retryCountRef.current += 1;
          setTimeout(() => {
            fetchCurrentUser(cleanToken);
          }, 3000 * retryCountRef.current);
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        return;
      }
      console.warn('[AuthContext] Temporary network interruption verifying session:', err?.message || err);
      // Bounded retry (max 2 times) to prevent infinite loops
      if (retryCountRef.current < 2) {
        retryCountRef.current += 1;
        setTimeout(() => {
          fetchCurrentUser(cleanToken);
        }, 3000 * retryCountRef.current);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCurrentUser();
    return () => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
    };
  }, [fetchCurrentUser]);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      localStorage.setItem('smtrading_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const sendRegisterVerificationCode = async (email: string, username?: string) => {
    try {
      const res = await fetch('/api/auth/send-register-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to send verification code' };
      }

      return {
        success: true,
        message: data.message || 'Verification code sent to your email',
        code: data.code,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while sending verification code' };
    }
  };

  const register = async (regData: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
    referralCode?: string;
    plan?: string;
    verificationCode: string;
  }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      localStorage.setItem('smtrading_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('smtrading_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const activateSubscription = async (durationMonths: number, planName?: string) => {
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/api/user/activate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ durationMonths, planName }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to activate subscription' };
      }

      setUser(data.user);
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to activate subscription' };
    }
  };

  const sendProfileVerificationCode = async (targetEmail?: string) => {
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/api/user/send-profile-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ targetEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to send security code' };
      }

      return {
        success: true,
        message: data.message || 'Security code sent to your email',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while requesting security code' };
    }
  };

  const updateProfile = async (profileUpdates: {
    fullName?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    username?: string;
    verificationCode?: string;
  }) => {
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileUpdates),
      });

      const data = await res.json();
      if (!res.ok) {
        return { 
          success: false, 
          error: data.error || 'Failed to update profile',
          requiresVerification: data.requiresVerification,
        };
      }

      setUser(data.profile);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  };

  const uploadAvatar = async (avatarData: string) => {
    if (!token || !user) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ avatarData, ownerId: user.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to upload profile picture' };
      }

      if (data.user) {
        setUser(data.user);
      }
      return { success: true, avatarUrl: data.avatarUrl, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while uploading avatar' };
    }
  };

  const removeAvatar = async () => {
    if (!token || !user) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/api/user/avatar', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ownerId: user.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to remove avatar' };
      }

      if (data.user) {
        setUser(data.user);
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while removing avatar' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to change password' };
      }

      return { success: true, message: data.message || 'Password changed successfully' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while updating password' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        login,
        sendRegisterVerificationCode,
        register,
        logout,
        refreshUser,
        activateSubscription,
        sendProfileVerificationCode,
        updateProfile,
        uploadAvatar,
        removeAvatar,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
