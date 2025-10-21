import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  username: string;
  email: string;
  name: string;
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
        localStorage.removeItem("frank_rock_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Fetch from master sheet to validate credentials
      const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
      const MASTER_SHEET_ID = import.meta.env.VITE_MASTER_SHEET_ID;
      
      if (!API_KEY || !MASTER_SHEET_ID) {
        return false;
      }
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${MASTER_SHEET_ID}/values/A:C?key=${API_KEY}`
      );
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      const rows = data.values || [];
      
      // Find matching user (skip header row)
      for (let i = 1; i < rows.length; i++) {
        const [sheetUsername, sheetPassword, sheetUrl] = rows[i];
        
        if (sheetUsername && sheetUsername.toLowerCase() === username.toLowerCase()) {
          // Check password
          if (sheetPassword === password) {
            const userData: User = {
              username: sheetUsername,
              email: `${sheetUsername}@example.com`,
              name: sheetUsername.charAt(0).toUpperCase() + sheetUsername.slice(1),
            };
            setUser(userData);
            localStorage.setItem("frank_rock_user", JSON.stringify(userData));
            localStorage.setItem("VITE_USER_NAME", sheetUsername); // Store for API calls
            return true;
          } else {
            return false;
          }
        }
      }
      
      return false;
    } catch (error) {
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

