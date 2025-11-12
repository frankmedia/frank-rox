import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/utils/supabaseClient";

interface User {
  username: string;
  email: string;
  name: string;
  clientId?: string; // For clients
  ptId?: string; // For PTs
  adminId?: string; // For admins
  role: 'client' | 'pt' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem("frank_rock_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("frank_rock_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log("🔐 Attempting login for:", username);
      
      // 1. Try admin login first
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("id, name, email, password")
        .eq("email", username)
        .maybeSingle();
      
      if (adminData && adminData.password === password) {
        console.log("✅ Admin login successful:", adminData.name);
        const userData: User = {
          username: adminData.name,
          email: adminData.email,
          name: adminData.name,
          adminId: String(adminData.id),
          role: 'admin',
        };
        setUser(userData);
        localStorage.setItem("frank_rock_user", JSON.stringify(userData));
        return true;
      }
      
      // 2. Try PT login
      const { data: ptData, error: ptError } = await supabase
        .from("personal_trainers")
        .select("id, name, email, password")
        .eq("email", username)
        .maybeSingle();
      
      if (ptData && ptData.password === password) {
        console.log("✅ PT login successful:", ptData.name);
        const userData: User = {
          username: ptData.name,
          email: ptData.email,
          name: ptData.name,
          ptId: String(ptData.id),
          role: 'pt',
        };
        setUser(userData);
        localStorage.setItem("frank_rock_user", JSON.stringify(userData));
        return true;
      }
      
      // 3. Try client login (fallback, using name instead of email)
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, email, password")
        .ilike("name", username)
        .maybeSingle();
      
      if (clientData && clientData.password === password) {
        console.log("✅ Client login successful:", clientData.name);
        const userData: User = {
          username: clientData.name,
          email: clientData.email || `${clientData.name}@example.com`,
          name: clientData.name.charAt(0).toUpperCase() + clientData.name.slice(1),
          clientId: String(clientData.id),
          role: 'client',
        };
        setUser(userData);
        localStorage.setItem("frank_rock_user", JSON.stringify(userData));
        localStorage.setItem("VITE_USER_NAME", clientData.name); // Store for compatibility
        return true;
      }
      
      console.log("❌ Invalid credentials for:", username);
      return false;
    } catch (error) {
      console.error("❌ Login error:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("frank_rock_user");
    localStorage.removeItem("VITE_USER_NAME");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
