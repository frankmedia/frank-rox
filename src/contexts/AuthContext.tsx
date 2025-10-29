import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/utils/supabaseClient";

interface User {
  username: string;
  email: string;
  name: string;
  clientId?: string; // Supabase client ID
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
      
      // Authenticate against Supabase clients table
      const { data: clientData, error } = await supabase
        .from("clients")
        .select("id, name, email, password")
        .ilike("name", username)
        .single();
      
      if (error || !clientData) {
        console.log("❌ User not found:", username);
        return false;
      }
      
      // Check password
      if (clientData.password !== password) {
        console.log("❌ Invalid password for user:", username);
        return false;
      }
      
      console.log("✅ Login successful for:", clientData.name);
      
      // Create user session
      const userData: User = {
        username: clientData.name,
        email: clientData.email || `${clientData.name}@example.com`,
        name: clientData.name.charAt(0).toUpperCase() + clientData.name.slice(1),
        clientId: String(clientData.id),
      };
      
      setUser(userData);
      localStorage.setItem("frank_rock_user", JSON.stringify(userData));
      localStorage.setItem("VITE_USER_NAME", clientData.name); // Store for compatibility
      
      return true;
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
