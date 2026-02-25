import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AdminProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: string;
  email: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  profile: AdminProfile | null;
  profileLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Pick<AdminProfile, "full_name" | "phone">>) => Promise<{ error: string | null }>;
  uploadAvatar: (file: File) => Promise<{ error: string | null; url?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async (userId: string, email: string | null) => {
    setProfileLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, phone, role")
      .eq("id", userId)
      .single();
    if (data) setProfile({ ...data, email });
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      if (session?.user) fetchProfile(session.user.id, session.user.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
      if (session?.user) fetchProfile(session.user.id, session.user.email ?? null);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (!profileData || profileData.role !== "admin") {
      await supabase.auth.signOut();
      return { error: "Access denied. Admin accounts only." };
    }

    return { error: null };
  };

  const logout = async () => {
    setProfile(null);
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id, session.user.email ?? null);
  };

  const updateProfile = async (
    data: Partial<Pick<AdminProfile, "full_name" | "phone">>
  ): Promise<{ error: string | null }> => {
    if (!session?.user) return { error: "Not authenticated" };
    const { error } = await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", session.user.id);
    if (error) return { error: error.message };
    setProfile((prev) => (prev ? { ...prev, ...data } : null));
    return { error: null };
  };

  const uploadAvatar = async (file: File): Promise<{ error: string | null; url?: string }> => {
    if (!session?.user) return { error: "Not authenticated" };
    const ext = file.name.split(".").pop();
    const path = `${session.user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) return { error: uploadError.message };

    const { data: { publicUrl } } = supabase.storage
      .from("profile-avatars")
      .getPublicUrl(path);

    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ avatar_url: urlWithCacheBust, updated_at: new Date().toISOString() })
      .eq("id", session.user.id);
    if (dbError) return { error: dbError.message };

    setProfile((prev) => (prev ? { ...prev, avatar_url: urlWithCacheBust } : null));
    return { error: null, url: urlWithCacheBust };
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session,
        isLoading,
        user: session?.user ?? null,
        profile,
        profileLoading,
        login,
        logout,
        updateProfile,
        uploadAvatar,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
