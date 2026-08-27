'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api-config';
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

const API_URL = API_BASE;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Tài khoản đã đồng bộ xong. Trước đây `login()` gọi đồng bộ, rồi
   * `onAuthStateChange` bắn tiếp sự kiện SIGNED_IN gọi lần thứ hai — và mỗi lần
   * Supabase làm mới token (TOKEN_REFRESHED, khoảng 1 giờ/lần) lại gọi thêm một
   * lần nữa. Ref này chặn các lần gọi trùng.
   */
  const syncedIdRef = useRef<string | null>(null);

  interface SyncOptions {
    desiredRole?: UserRole;
    secretCode?: string;
    /** Bỏ qua bộ chặn trùng (dùng cho refreshProfile / đăng ký) */
    force?: boolean;
  }

  // Sync profile with backend
  const fetchOrSyncProfile = useCallback(async (supabaseUser: User, options?: SyncOptions) => {
    const { desiredRole, secretCode, force } = options || {};
    if (!force && syncedIdRef.current === supabaseUser.id) return;
    syncedIdRef.current = supabaseUser.id;

    try {
      // 1. First attempt to get profile from backend
      const res = await fetch(`${API_URL}/auth/me/${supabaseUser.id}`);
      if (res.ok) {
        const data = await res.json();
        const p = data.data || data;
        // Backend không luôn trả `isTeacher` → suy ra từ `role` cho chắc
        setProfile({ ...p, isTeacher: p.role === 'TEACHER' });
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
      } else {
        // Đồng bộ thất bại → cho phép thử lại ở lần đăng nhập / refresh sau
        syncedIdRef.current = null;
      }
    } catch (err) {
      console.warn('Backend profile sync notice:', err);
      // Máy chủ miễn phí có thể đang khởi động lại → lần sau phải thử lại
      syncedIdRef.current = null;
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      setIsLoading(false);
      return { error: error.message };
    }

    /**
     * KHÔNG gọi fetchOrSyncProfile ở đây: `onAuthStateChange` bên trên đã nhận
     * sự kiện SIGNED_IN và tự đồng bộ. Gọi thêm chỉ tạo request trùng.
     */
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
      // Đăng ký PHẢI gọi trực tiếp: chỉ ở đây mới có role mong muốn và mã bí mật
      // của giáo viên để gửi sang backend.
      await fetchOrSyncProfile(data.user, { desiredRole: role, secretCode, force: true });
    }
    setIsLoading(false);
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    syncedIdRef.current = null;
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
      // `force` để vượt qua bộ chặn trùng — đây là lần làm mới CÓ CHỦ Ý
      await fetchOrSyncProfile(user, { force: true });
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
