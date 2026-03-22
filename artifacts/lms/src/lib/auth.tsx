import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMe, login as apiLogin, register as apiRegister, getGetMeQueryKey, setAuthTokenGetter } from "@workspace/api-client-react";
import type { LoginRequest, RegisterRequest, UserProfile } from "@workspace/api-client-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// Wire up the token getter so all generated API calls include the JWT
setAuthTokenGetter(() => localStorage.getItem("token"));

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const userData = await getMe();
        setUser(userData);
      } catch (error) {
        console.error("Auth init failed", error);
        localStorage.removeItem("token");
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      const response = await apiLogin(data);
      localStorage.setItem("token", response.token);
      setUser(response.user);
      queryClient.setQueryData(getGetMeQueryKey(), response.user);
      toast.success("Welcome back!");
      
      // Redirect based on role
      if (response.user.role === 'owner' || response.user.role === 'instructor') {
        setLocation('/admin');
      } else {
        setLocation('/my-learning');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await apiRegister(data);
      localStorage.setItem("token", response.token);
      setUser(response.user);
      queryClient.setQueryData(getGetMeQueryKey(), response.user);
      toast.success("Account created successfully!");
      setLocation(response.user.role === 'student' ? '/my-learning' : '/admin');
    } catch (error: any) {
      toast.error(error.message || "Failed to register");
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    queryClient.clear();
    toast.success("Logged out successfully");
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      register, 
      logout,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
