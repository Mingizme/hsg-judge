'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export type UserRole = 'TEACHER' | 'STUDENT';

export interface UserProfile {
  id: string;
  supabaseId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  isTeacher: boolean;
  totalSubmissions?: number;
  totalSolved?: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isTeacher: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ error: string | null }>;
  signup: (
    email: string,
    pass: string,
    displayName: string,
    role: UserRole,
    secretCode?: string
  ) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  upgradeToTeacher: (secretCode: string) => Promise<{ success: boolean; message: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: 'STUDENT',
  isTeacher: false,
  isLoading: true,
  login: async () => ({ error: null }),
  signup: async () => ({ error: null }),
  logout: async () => {},
  upgradeToTeacher: async () => ({ success: false, message: '' }),
  refreshProfile: async () => {},
});

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://hsg-judge.onrender.com/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync profile with backend
  const fetchOrSyncProfile = useCallback(async (supabaseUser: User, desiredRole?: UserRole, secretCode?: string) => {
    try {
      // 1. First attempt to get profile from backend
      const res = await fetch(`${API_URL}/auth/me/${supabaseUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.data);
        return;
      }

      // 2. If not found, sync to backend
      const syncRes = await fetch(`${API_URL}/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseId: supabaseUser.id,
          email: supabaseUser.email,
          displayName: supabaseUser.user_metadata?.displayName || supabaseUser.email?.split('@')[0],
          role: desiredRole || (supabaseUser.user_metadata?.role as UserRole) || 'STUDENT',
          teacherSecretCode: secretCode,
        }),
      });

      if (syncRes.ok) {
        const syncData = await syncRes.json();
        setProfile({
          ...syncData.data,
          isTeacher: syncData.data.role === 'TEACHER',
        });
      }
    } catch (err) {
      console.warn('Backend profile sync notice:', err);
      // Fallback local mock profile if backend is starting up
      const isTeacherRole = (desiredRole || supabaseUser.user_metadata?.role) === 'TEACHER';
      setProfile({
        id: supabaseUser.id,
        supabaseId: supabaseUser.id,
        email: supabaseUser.email || '',
        displayName: supabaseUser.user_metadata?.displayName || supabaseUser.email?.split('@')[0] || 'User',
        role: isTeacherRole ? 'TEACHER' : 'STUDENT',
        isTeacher: isTeacherRole,
      });
    }
  }, []);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchOrSyncProfile(session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchOrSyncProfile(session.user);
        } else {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchOrSyncProfile]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      setIsLoading(false);
      return { error: error.message };
    }

    if (data.user) {
      await fetchOrSyncProfile(data.user);
    }
    setIsLoading(false);
    return { error: null };
  };

  const signup = async (
    email: string,
    pass: string,
    displayName: string,
    role: UserRole,
    secretCode?: string
  ) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          displayName,
          role,
        },
      },
    });

    if (error) {
      setIsLoading(false);
      return { error: error.message };
    }

    if (data.user) {
      await fetchOrSyncProfile(data.user, role, secretCode);
    }
    setIsLoading(false);
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const upgradeToTeacher = async (secretCode: string) => {
    if (!profile?.email) {
      return { success: false, message: 'Vui lòng đăng nhập trước' };
    }

    try {
      const res = await fetch(`${API_URL}/auth/upgrade-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email,
          secretCode,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfile((prev) => prev ? { ...prev, role: 'TEACHER', isTeacher: true } : null);
        return { success: true, message: 'Nâng cấp quyền Giáo viên thành công!' };
      } else {
        return { success: false, message: data.message || 'Mã xác thực không hợp lệ' };
      }
    } catch {
      return { success: false, message: 'Lỗi kết nối máy chủ' };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchOrSyncProfile(user);
    }
  };

  const currentRole = profile?.role || (user?.user_metadata?.role as UserRole) || 'STUDENT';
  const isTeacher = currentRole === 'TEACHER';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: currentRole,
        isTeacher,
        isLoading,
        login,
        signup,
        logout,
        upgradeToTeacher,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
