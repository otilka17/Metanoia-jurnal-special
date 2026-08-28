import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { storage } from "@/src/utils/storage";
import { api, TOKEN_KEY } from "@/src/lib/api";

type User = { id: string; email: string; name: string; is_admin?: boolean; assistant_name?: string | null };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await storage.secureGet(TOKEN_KEY, "");
      if (token) {
        try {
          const me: any = await api.me();
          setUser({ id: me.id, email: me.email, name: me.name, is_admin: me.is_admin, assistant_name: me.assistant_name });
        } catch {
          await storage.secureRemove(TOKEN_KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res: any = await api.login(email, password);
    await storage.secureSet(TOKEN_KEY, res.access_token);
    setUser(res.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const res: any = await api.register(email, password, name);
    await storage.secureSet(TOKEN_KEY, res.access_token);
    setUser(res.user);
  };

  const logout = async () => {
    await storage.secureRemove(TOKEN_KEY);
    setUser(null);
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
